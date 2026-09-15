import 'package:ore_core/ore_core.dart';

import 'rider_token_storage.dart';

/// Response returned by the public auth OTP request endpoint.
class RiderOtpRequestResult {
  const RiderOtpRequestResult({
    required this.sent,
    this.devCode,
  });

  final bool sent;
  final String? devCode;

  factory RiderOtpRequestResult.fromJson(Object? json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('OTP request response must be a JSON object');
    }

    final sent = json['sent'];
    if (sent is! bool) {
      throw const FormatException(
        'OTP request response is missing a boolean sent field',
      );
    }

    final devCode = json['devCode'];
    if (devCode != null && devCode is! String) {
      throw const FormatException('OTP request devCode must be a string');
    }

    return RiderOtpRequestResult(
      sent: sent,
      devCode: devCode as String?,
    );
  }
}

/// Authenticated user data returned with a verified OTP response.
class RiderAuthenticatedUser {
  const RiderAuthenticatedUser({
    required this.id,
    required this.phone,
    required this.role,
    this.name,
    this.publicId,
    this.riderId,
  });

  final String id;
  final String phone;
  final String role;
  final String? name;
  final String? publicId;
  final String? riderId;

  factory RiderAuthenticatedUser.fromJson(Object? json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Authenticated user must be a JSON object');
    }
    return _parseAuthenticatedUser(json, idField: 'id');
  }

  /// Parses the JWT payload returned by `GET /auth/me`.
  factory RiderAuthenticatedUser.fromCurrentUserJson(Object? json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Current user must be a JSON object');
    }
    return _parseAuthenticatedUser(json, idField: 'sub');
  }
}

/// Result of OTP verification, including the tokens persisted for the rider.
class RiderOtpVerificationResult {
  const RiderOtpVerificationResult({
    required this.tokens,
    required this.user,
  });

  final RiderStoredTokens tokens;
  final RiderAuthenticatedUser user;

  factory RiderOtpVerificationResult.fromJson(Object? json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException(
        'OTP verification response must be a JSON object',
      );
    }

    return RiderOtpVerificationResult(
      tokens: RiderStoredTokens(
        accessToken: _requiredString(json['accessToken'], 'accessToken'),
        refreshToken: _requiredString(json['refreshToken'], 'refreshToken'),
      ),
      user: RiderAuthenticatedUser.fromJson(json['user']),
    );
  }
}

/// Auth-service operations used by the rider app.
class RiderAuthRepository {
  const RiderAuthRepository(this._client, this._tokenStorage);

  final OreApiClient _client;
  final RiderTokenStorage _tokenStorage;

  /// Requests an OTP for a rider phone number.
  ///
  /// The backend contract uses the lowercase serialized enum value `rider`.
  /// Dio and response-validation errors intentionally propagate to the caller
  /// so the UI/state layer can present the appropriate message.
  Future<RiderOtpRequestResult> requestOtp({required String phone}) async {
    final normalizedPhone = _normalizeE164Phone(phone);
    final response = await _client.post<Map<String, dynamic>>(
      OreEndpoints.requestOtp,
      data: <String, dynamic>{
        'phone': normalizedPhone,
        'role': 'rider',
      },
    );

    return RiderOtpRequestResult.fromJson(response.data);
  }

  /// Verifies the six-digit OTP and persists the returned token pair.
  Future<RiderOtpVerificationResult> verifyOtp({
    required String phone,
    required String code,
  }) async {
    final normalizedPhone = _normalizeE164Phone(phone);
    if (!RegExp(r'^\d{6}$').hasMatch(code)) {
      throw ArgumentError.value(
        code,
        'code',
        'OTP code must contain exactly 6 digits',
      );
    }

    final response = await _client.post<Map<String, dynamic>>(
      OreEndpoints.verifyOtp,
      data: <String, dynamic>{
        'phone': normalizedPhone,
        'code': code,
        'targetRole': 'rider',
      },
    );

    final result = RiderOtpVerificationResult.fromJson(response.data);
    await _tokenStorage.save(result.tokens);
    return result;
  }

  /// Fetches the authenticated JWT payload to restore a saved session.
  Future<RiderAuthenticatedUser> getCurrentUser() async {
    final response = await _client.getFresh<Map<String, dynamic>>(
      OreEndpoints.me,
    );
    return RiderAuthenticatedUser.fromCurrentUserJson(response.data);
  }

  /// Exchanges the stored refresh token for a new pair. Returns null if none stored.
  Future<RiderStoredTokens?> refresh() async {
    final current = await _tokenStorage.read();
    if (current == null) return null;
    final response = await _client.post<Map<String, dynamic>>(
      OreEndpoints.refresh,
      data: <String, dynamic>{'refreshToken': current.refreshToken},
    );
    final access = response.data?['accessToken'];
    final refreshToken = response.data?['refreshToken'];
    if (access is! String || refreshToken is! String) return null;
    final tokens = RiderStoredTokens(accessToken: access, refreshToken: refreshToken);
    await _tokenStorage.save(tokens);
    _client.setToken(access);
    return tokens;
  }
}

RiderAuthenticatedUser _parseAuthenticatedUser(
  Map<String, dynamic> json, {
  required String idField,
}) {
  final role = _requiredString(json['role'], 'user.role');
  if (role != 'rider') {
    throw FormatException('Authenticated user has unexpected role: $role');
  }

  final name = json['name'];
  if (name != null && name is! String) {
    throw const FormatException('Authenticated user name must be a string');
  }

  final publicId = json['publicId'];
  if (publicId != null && publicId is! String) {
    throw const FormatException(
      'Authenticated user publicId must be a string',
    );
  }

  final riderId = json['riderId'];
  if (riderId != null && riderId is! String) {
    throw const FormatException('Authenticated user riderId must be a string');
  }

  return RiderAuthenticatedUser(
    id: _requiredString(json[idField], 'user.$idField'),
    phone: _normalizeBackendPhone(_requiredString(json['phone'], 'user.phone')),
    role: role,
    name: name as String?,
    publicId: publicId as String?,
    riderId: riderId as String?,
  );
}

String _requiredString(Object? value, String field) {
  if (value is! String || value.isEmpty) {
    throw FormatException('Missing or invalid $field');
  }
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
  final normalized = phone.replaceAll(RegExp(r'\s+'), '');
  if (!RegExp(r'^\+\d{8,15}$').hasMatch(normalized)) {
    throw ArgumentError.value(
      phone,
      'phone',
      'Phone must be an E.164-formatted number such as +233241234567',
    );
  }
  return normalized;
}
