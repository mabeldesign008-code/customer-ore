import 'package:ore_core/ore_core.dart';

import 'vendor_token_storage.dart';

class VendorOtpRequestResult {
  const VendorOtpRequestResult({required this.sent, this.devCode});

  final bool sent;
  final String? devCode;

  factory VendorOtpRequestResult.fromJson(Object? json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Vendor OTP response must be a JSON object');
    }
    if (json['sent'] is! bool) {
      throw const FormatException('Vendor OTP response is missing sent');
    }
    final devCode = json['devCode'];
    if (devCode != null && devCode is! String) {
      throw const FormatException('Vendor OTP devCode must be a string');
    }
    return VendorOtpRequestResult(sent: json['sent'] as bool, devCode: devCode as String?);
  }
}

class VendorAuthenticatedUser {
  const VendorAuthenticatedUser({
    required this.id,
    required this.phone,
    required this.role,
    this.name,
    this.publicId,
  });

  final String id;
  final String phone;
  final String role;
  final String? name;
  final String? publicId;

  factory VendorAuthenticatedUser.fromJson(Object? json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Vendor user must be a JSON object');
    }
    return _parseUser(json, 'id');
  }

  factory VendorAuthenticatedUser.fromCurrentUserJson(Object? json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Current vendor user must be a JSON object');
    }
    return _parseUser(json, 'sub');
  }
}

class VendorOtpVerificationResult {
  const VendorOtpVerificationResult({required this.tokens, required this.user});

  final VendorStoredTokens tokens;
  final VendorAuthenticatedUser user;

  factory VendorOtpVerificationResult.fromJson(Object? json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Vendor verification response must be a JSON object');
    }
    return VendorOtpVerificationResult(
      tokens: VendorStoredTokens(
        accessToken: _requiredString(json['accessToken'], 'accessToken'),
        refreshToken: _requiredString(json['refreshToken'], 'refreshToken'),
      ),
      user: VendorAuthenticatedUser.fromJson(json['user']),
    );
  }
}

class VendorAuthRepository {
  const VendorAuthRepository(this._client, this._storage);

  final OreApiClient _client;
  final VendorTokenStorage _storage;

  Future<VendorOtpRequestResult> requestOtp({required String phone}) async {
    final response = await _client.post<Map<String, dynamic>>(
      OreEndpoints.requestOtp,
      data: <String, dynamic>{
        'phone': _normalizeE164Phone(phone),
        'role': 'vendor',
      },
    );
    return VendorOtpRequestResult.fromJson(response.data);
  }

  Future<VendorOtpVerificationResult> verifyOtp({
    required String phone,
    required String code,
  }) async {
    if (!RegExp(r'^\d{6}$').hasMatch(code)) {
      throw ArgumentError.value(code, 'code', 'OTP code must contain six digits');
    }
    final response = await _client.post<Map<String, dynamic>>(
      OreEndpoints.verifyOtp,
      data: <String, dynamic>{
        'phone': _normalizeE164Phone(phone),
        'code': code,
        'targetRole': 'vendor',
      },
    );
    final result = VendorOtpVerificationResult.fromJson(response.data);
    await _storage.save(result.tokens);
    return result;
  }

  Future<VendorAuthenticatedUser> getCurrentUser() async {
    final response = await _client.getFresh<Map<String, dynamic>>(OreEndpoints.me);
    return VendorAuthenticatedUser.fromCurrentUserJson(response.data);
  }

  /// Exchanges the stored refresh token for a new pair. Returns null if none stored.
  Future<VendorStoredTokens?> refresh() async {
    final current = await _storage.read();
    if (current == null) return null;
    final response = await _client.post<Map<String, dynamic>>(
      OreEndpoints.refresh,
      data: <String, dynamic>{'refreshToken': current.refreshToken},
    );
    final access = response.data?['accessToken'];
    final refreshToken = response.data?['refreshToken'];
    if (access is! String || refreshToken is! String) return null;
    final tokens = VendorStoredTokens(accessToken: access, refreshToken: refreshToken);
    await _storage.save(tokens);
    _client.setToken(access);
    return tokens;
  }
}

VendorAuthenticatedUser _parseUser(Map<String, dynamic> json, String idField) {
  final role = _requiredString(json['role'], 'user.role');
  if (role != 'vendor') {
    throw FormatException('Authenticated user has unexpected role: $role');
  }
  final name = json['name'];
  if (name != null && name is! String) {
    throw const FormatException('Vendor user name must be a string or null');
  }
  final publicId = json['publicId'];
  if (publicId != null && publicId is! String) {
    throw const FormatException('Vendor user publicId must be a string or null');
  }
  return VendorAuthenticatedUser(
    id: _requiredString(json[idField], 'user.$idField'),
    phone: _normalizeBackendPhone(_requiredString(json['phone'], 'user.phone')),
    role: role,
    name: name as String?,
    publicId: publicId as String?,
  );
}

String _requiredString(Object? value, String field) {
  if (value is! String || value.isEmpty) throw FormatException('Missing or invalid $field');
  return value;
}

String _normalizeBackendPhone(String phone) {
  final compact = phone.replaceAll(RegExp(r'\s+'), '');
  if (compact.startsWith('+')) return compact;
  if (compact.startsWith('233')) return '+$compact';
  if (compact.startsWith('0')) return '+233${compact.substring(1)}';
  return '+$compact';
}

String _normalizeE164Phone(String phone) {
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
