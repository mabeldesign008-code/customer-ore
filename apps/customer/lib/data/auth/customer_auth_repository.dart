import 'package:ore_core/ore_core.dart';

import 'customer_token_storage.dart';

class CustomerOtpRequestResult {
  const CustomerOtpRequestResult({required this.sent, this.devCode});

  final bool sent;
  final String? devCode;

  factory CustomerOtpRequestResult.fromJson(Object? json) {
    if (json is! Map<String, dynamic>) throw const FormatException('Customer OTP response must be an object');
    if (json['sent'] is! bool) throw const FormatException('Customer OTP response is missing sent');
    final devCode = json['devCode'];
    if (devCode != null && devCode is! String) throw const FormatException('Customer OTP devCode must be a string');
    return CustomerOtpRequestResult(sent: json['sent'] as bool, devCode: devCode as String?);
  }
}

class CustomerAuthenticatedUser {
  const CustomerAuthenticatedUser({
    required this.id,
    required this.phone,
    required this.role,
    this.name,
    this.email,
    this.publicId,
  });

  final String id;
  final String phone;
  final String role;
  final String? name;
  final String? email;
  final String? publicId;

  bool get needsProfileSetup => name == null || name!.trim().isEmpty;

  factory CustomerAuthenticatedUser.fromJson(Object? json, {String idField = 'id'}) {
    if (json is! Map<String, dynamic>) throw const FormatException('Customer user must be an object');
    final role = _requiredString(json['role'], 'user.role');
    if (role != 'customer') throw FormatException('Authenticated user has unexpected role: $role');
    final name = json['name'];
    if (name != null && name is! String) throw const FormatException('Customer user name must be a string or null');
    final email = json['email'];
    if (email != null && email is! String) throw const FormatException('Customer user email must be a string or null');
    final publicId = json['publicId'];
    if (publicId != null && publicId is! String) throw const FormatException('Customer user publicId must be a string or null');
    return CustomerAuthenticatedUser(
      id: _requiredString(json[idField], 'user.$idField'),
      phone: normalizeCustomerPhone(_requiredString(json['phone'], 'user.phone')),
      role: role,
      name: name as String?,
      email: email as String?,
      publicId: publicId as String?,
    );
  }

  CustomerAuthenticatedUser copyWith({String? name, String? email, String? publicId}) {
    return CustomerAuthenticatedUser(
      id: id,
      phone: phone,
      role: role,
      name: name ?? this.name,
      email: email ?? this.email,
      publicId: publicId ?? this.publicId,
    );
  }
}

class CustomerOtpVerificationResult {
  const CustomerOtpVerificationResult({required this.tokens, required this.user});

  final CustomerStoredTokens tokens;
  final CustomerAuthenticatedUser user;

  factory CustomerOtpVerificationResult.fromJson(Object? json) {
    if (json is! Map<String, dynamic>) throw const FormatException('Customer verification response must be an object');
    return CustomerOtpVerificationResult(
      tokens: CustomerStoredTokens(
        accessToken: _requiredString(json['accessToken'], 'accessToken'),
        refreshToken: _requiredString(json['refreshToken'], 'refreshToken'),
      ),
      user: CustomerAuthenticatedUser.fromJson(json['user']),
    );
  }
}

class CustomerAuthRepository {
  const CustomerAuthRepository(this._client, this._storage);

  final OreApiClient _client;
  final CustomerTokenStorage _storage;

  Future<CustomerOtpRequestResult> requestOtp(String phone) async {
    final response = await _client.post<Map<String, dynamic>>(
      OreEndpoints.requestOtp,
      data: <String, dynamic>{'phone': normalizeCustomerPhone(phone), 'role': 'customer'},
    );
    return CustomerOtpRequestResult.fromJson(response.data);
  }

  Future<CustomerAuthenticatedUser> verifyOtp({required String phone, required String code}) async {
    if (!RegExp(r'^\d{6}$').hasMatch(code)) {
      throw ArgumentError.value(code, 'code', 'Customer OTP must contain six digits');
    }
    final response = await _client.post<Map<String, dynamic>>(
      OreEndpoints.verifyOtp,
      data: <String, dynamic>{
        'phone': normalizeCustomerPhone(phone),
        'code': code,
        'targetRole': 'customer',
      },
    );
    final result = CustomerOtpVerificationResult.fromJson(response.data);
    await _storage.save(result.tokens);
    return result.user;
  }

  Future<CustomerAuthenticatedUser> updateProfile({required String name, String? email}) async {
    final response = await _client.patch<Map<String, dynamic>>(
      OreEndpoints.updateProfile,
      data: <String, dynamic>{
        'name': name.trim(),
        if (email != null && email.trim().isNotEmpty) 'email': email.trim(),
        'termsAccepted': true,
      },
    );
    return CustomerAuthenticatedUser.fromJson(response.data);
  }

  Future<CustomerStoredTokens?> refresh() async {
    final current = await _storage.read();
    if (current == null) return null;
    final response = await _client.post<Map<String, dynamic>>(
      OreEndpoints.refresh,
      data: <String, dynamic>{'refreshToken': current.refreshToken},
    );
    final access = response.data?['accessToken'];
    final refreshToken = response.data?['refreshToken'];
    if (access is! String || refreshToken is! String) return null;
    final tokens = CustomerStoredTokens(accessToken: access, refreshToken: refreshToken);
    await _storage.save(tokens);
    _client.setToken(access);
    return tokens;
  }

  Future<CustomerAuthenticatedUser> getCurrentUser() async {
    final response = await _client.getFresh<Map<String, dynamic>>(OreEndpoints.me);
    return CustomerAuthenticatedUser.fromJson(response.data, idField: 'sub');
  }
}

String normalizeCustomerPhone(String phone) {
  final compact = phone.replaceAll(RegExp(r'\s+'), '');
  final normalized = compact.startsWith('0')
      ? '+233${compact.substring(1)}'
      : compact.startsWith('233')
          ? '+$compact'
          : compact.startsWith('+')
              ? compact
              : '+233$compact';
  if (!RegExp(r'^\+\d{8,15}$').hasMatch(normalized)) {
    throw ArgumentError.value(phone, 'phone', 'Phone must be E.164, for example +233241234567');
  }
  return normalized;
}

String _requiredString(Object? value, String field) {
  if (value is! String || value.isEmpty) throw FormatException('Missing or invalid $field');
  return value;
}
