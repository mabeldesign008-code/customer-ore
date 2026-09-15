import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import 'api_client.dart';
import 'comms_models.dart';
import 'endpoints.dart';

/// HTTP client for order + support threads. Same contract for customer, rider, vendor.
class OreCommsClient {
  const OreCommsClient(this._client);

  final OreApiClient _client;

  static const int messageMax = 2000;

  Future<OreCommsThread> openThread(String orderId) async {
    final trimmed = orderId.trim();
    if (trimmed.isEmpty) {
      throw ArgumentError.value(orderId, 'orderId', 'Order id is required');
    }
    final response = await _client.post<Map<String, dynamic>>(
      OreEndpoints.commsThreads,
      data: <String, dynamic>{'orderId': trimmed},
    );
    final parsed = OreCommsThread.tryParse(response.data);
    if (parsed == null) {
      throw const FormatException('Thread response is invalid');
    }
    return parsed;
  }

  /// Idempotent inbox for the signed-in user ↔ Ore Support. No bot seed.
  Future<OreCommsThread> openSupportThread() async {
    final response = await _client.post<Map<String, dynamic>>(
      OreEndpoints.commsThreads,
      data: <String, dynamic>{'kind': 'support'},
    );
    final parsed = OreCommsThread.tryParse(response.data);
    if (parsed == null) {
      throw const FormatException('Support thread response is invalid');
    }
    return parsed;
  }

  Future<List<OreCommsMessage>> listMessages(
    String threadId, {
    String? before,
    int limit = 50,
  }) async {
    final take = limit.clamp(1, 100);
    final response = await _client.getFresh<List<dynamic>>(
      OreEndpoints.commsThreadMessages(threadId),
      query: <String, dynamic>{
        if (before != null && before.trim().isNotEmpty) 'before': before.trim(),
        'limit': take,
      },
    );
    final rows = response.data ?? const <dynamic>[];
    return rows.map(OreCommsMessage.tryParse).whereType<OreCommsMessage>().toList(growable: false);
  }

  Future<OreCommsMessage> postMessage(String threadId, String body) async {
    final trimmed = body.trim();
    if (trimmed.isEmpty || trimmed.length > messageMax) {
      throw ArgumentError.value(body, 'body', 'Message body must be 1–2000 characters');
    }
    final response = await _client.post<Map<String, dynamic>>(
      OreEndpoints.commsThreadMessages(threadId),
      data: <String, dynamic>{'body': trimmed},
    );
    final parsed = OreCommsMessage.tryParse(response.data);
    if (parsed == null) {
      throw const FormatException('Message response is invalid');
    }
    return parsed;
  }

  /// Which Twilio push credential the backend must embed in the access token:
  /// Android (FCM v1) and iOS (APNs VoIP) are separate; web/macOS need none.
  static String currentVoicePlatform() {
    if (kIsWeb) return 'web';
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return 'android';
      case TargetPlatform.iOS:
        return 'ios';
      default:
        return 'web';
    }
  }

  Future<OreVoiceSession> issueVoiceToken(String orderId, {String? platform}) async {
    final response = await _client.post<Map<String, dynamic>>(
      OreEndpoints.commsVoiceToken,
      data: <String, dynamic>{
        'orderId': orderId.trim(),
        'platform': platform ?? currentVoicePlatform(),
      },
    );
    final parsed = OreVoiceSession.tryParse(response.data);
    if (parsed == null) throw const FormatException('Voice token response is invalid');
    return parsed;
  }

  Future<OreVoiceSession> startCall({
    required String orderId,
    required OreVoiceTarget target,
    String? platform,
  }) async {
    final response = await _client.post<Map<String, dynamic>>(
      OreEndpoints.commsCalls,
      data: <String, dynamic>{
        'orderId': orderId.trim(),
        'target': target.name,
        'platform': platform ?? currentVoicePlatform(),
      },
    );
    final parsed = OreVoiceSession.tryParse(response.data);
    if (parsed == null) throw const FormatException('Call response is invalid');
    return parsed;
  }

  /// Support VoIP call — rings online browser agents, forwards to the agent
  /// mobile, then recorded voicemail. [topic] lands on the CDR row.
  Future<OreVoiceSession> startSupportCall({String? platform, String? topic}) async {
    final trimmedTopic = topic?.trim() ?? '';
    final response = await _client.post<Map<String, dynamic>>(
      OreEndpoints.commsSupportCall,
      data: <String, dynamic>{
        'platform': platform ?? currentVoicePlatform(),
        if (trimmedTopic.isNotEmpty && trimmedTopic.length <= 120) 'topic': trimmedTopic,
      },
    );
    final parsed = OreVoiceSession.tryParse(response.data);
    if (parsed == null) throw const FormatException('Support call response is invalid');
    return parsed;
  }

  /// Never throws — support screens degrade to "no phone listed" on failure.
  Future<OreSupportContact> supportContact() async {
    try {
      final response = await _client.getFresh<Map<String, dynamic>>(OreEndpoints.commsSupportContact);
      return OreSupportContact.tryParse(response.data);
    } catch (_) {
      return OreSupportContact.empty;
    }
  }

  /// Fire-and-forget CDR event (fallback handoffs are invisible to Twilio).
  Future<void> reportCallEvent(String callId, OreCallEventKind kind, {String? detail}) async {
    final trimmed = callId.trim();
    if (trimmed.isEmpty) return;
    try {
      await _client.post<Map<String, dynamic>>(
        OreEndpoints.commsCallEvents(trimmed),
        data: <String, dynamic>{
          'kind': kind.wire,
          if (detail != null && detail.trim().isNotEmpty) 'detail': detail.trim().substring(0, detail.trim().length > 200 ? 200 : detail.trim().length),
        },
      );
    } catch (_) {
      // Best-effort telemetry; never break the call UX over it.
    }
  }

  /// Honest copy from the Nest `{ error: { message } }` envelope.
  static String describeError(Object error) {
    if (error is DioException) {
      final body = error.response?.data;
      if (body is Map && body['error'] is Map) {
        final message = (body['error'] as Map)['message']?.toString().trim();
        if (message != null && message.isNotEmpty) return message;
      }
      final status = error.response?.statusCode;
      if (status == 403) return 'You cannot open this chat.';
      if (status == 404) return 'This chat is not available.';
      if (status == 401) return 'Sign in again to use chat.';
      if (error.type == DioExceptionType.connectionError ||
          error.type == DioExceptionType.connectionTimeout ||
          error.type == DioExceptionType.receiveTimeout) {
        return 'No connection. Try again.';
      }
    }
    if (error is FormatException) return error.message;
    if (error is ArgumentError) return error.message ?? 'Message could not be sent.';
    return 'Chat could not load.';
  }
}
