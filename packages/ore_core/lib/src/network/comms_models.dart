enum OreCommsThreadKind { order, support }

/// DTOs for `/api/comms` order + support threads. Null parse = do not invent a message.
class OreCommsThread {
  const OreCommsThread({
    required this.threadId,
    required this.kind,
    required this.orderId,
    required this.customerId,
    required this.vendorId,
    required this.riderId,
    required this.createdAt,
    required this.updatedAt,
    this.ownerUserId,
    this.ownerRole,
  });

  final String threadId;
  final OreCommsThreadKind kind;
  final String? orderId;
  final String? ownerUserId;
  final String? ownerRole;
  final String customerId;
  final String vendorId;
  final String? riderId;
  final DateTime createdAt;
  final DateTime updatedAt;

  bool get isSupport => kind == OreCommsThreadKind.support;

  static OreCommsThread? tryParse(Object? json) {
    if (json is! Map) return null;
    final row = Map<String, dynamic>.from(json);
    final threadId = row['threadId']?.toString().trim() ?? '';
    if (threadId.isEmpty) return null;
    final kindRaw = row['kind']?.toString().trim();
    final kind = kindRaw == 'support'
        ? OreCommsThreadKind.support
        : kindRaw == 'order' || kindRaw == null || kindRaw.isEmpty
            ? OreCommsThreadKind.order
            : null;
    if (kind == null) return null;
    final orderRaw = row['orderId']?.toString().trim();
    final orderId = orderRaw == null || orderRaw.isEmpty ? null : orderRaw;
    if (kind == OreCommsThreadKind.order && orderId == null) return null;
    final createdAt = DateTime.tryParse(row['createdAt']?.toString() ?? '');
    final updatedAt = DateTime.tryParse(row['updatedAt']?.toString() ?? '');
    if (createdAt == null || updatedAt == null) return null;
    final riderRaw = row['riderId']?.toString().trim();
    final ownerRaw = row['ownerUserId']?.toString().trim();
    final ownerRole = row['ownerRole']?.toString().trim();
    return OreCommsThread(
      threadId: threadId,
      kind: kind,
      orderId: orderId,
      ownerUserId: ownerRaw == null || ownerRaw.isEmpty ? null : ownerRaw,
      ownerRole: ownerRole == null || ownerRole.isEmpty ? null : ownerRole,
      customerId: row['customerId']?.toString() ?? '',
      vendorId: row['vendorId']?.toString() ?? '',
      riderId: riderRaw == null || riderRaw.isEmpty ? null : riderRaw,
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }
}

class OreCommsMessage {
  const OreCommsMessage({
    required this.id,
    required this.threadId,
    required this.senderUserId,
    required this.senderRole,
    required this.body,
    required this.createdAt,
  });

  final String id;
  final String threadId;
  final String senderUserId;
  final String senderRole;
  final String body;
  final DateTime createdAt;

  String get roleLabel {
    switch (senderRole.trim().toLowerCase()) {
      case 'customer':
        return 'Customer';
      case 'rider':
        return 'Rider';
      case 'vendor':
        return 'Vendor';
      case 'admin':
        return 'Ore';
      case 'support':
        return 'Ore Support';
      default:
        return senderRole.trim().isEmpty ? 'Member' : senderRole;
    }
  }

  static OreCommsMessage? tryParse(Object? json) {
    if (json is! Map) return null;
    final row = Map<String, dynamic>.from(json);
    final id = row['id']?.toString().trim() ?? '';
    final threadId = row['threadId']?.toString().trim() ?? '';
    final body = row['body']?.toString() ?? '';
    if (id.isEmpty || threadId.isEmpty || body.isEmpty) return null;
    final createdAt = DateTime.tryParse(row['createdAt']?.toString() ?? '');
    if (createdAt == null) return null;
    return OreCommsMessage(
      id: id,
      threadId: threadId,
      senderUserId: row['senderUserId']?.toString() ?? '',
      senderRole: row['senderRole']?.toString() ?? '',
      body: body,
      createdAt: createdAt,
    );
  }
}

enum OreVoiceTarget { customer, rider, vendor, support }

enum OreVoiceProvider { log, twilio }

/// Client-reported call events. The Twilio status callback only sees Twilio legs;
/// the `tel:` fallback handoff happens entirely on the device, so the apps report it.
enum OreCallEventKind {
  fallbackOffered('fallback_offered'),
  fallbackStarted('fallback_started'),
  voipFailed('voip_failed'),
  qualityPoor('quality_poor'),
  qualityRecovered('quality_recovered');

  const OreCallEventKind(this.wire);
  final String wire;
}

class OreVoiceSession {
  const OreVoiceSession({
    required this.provider,
    this.target,
    this.identity,
    this.toIdentity,
    this.token,
    this.expiresAt,
    this.ttlSec,
    this.callId,
    this.fallbackPhone,
    this.support = false,
  });

  final OreVoiceProvider provider;
  final OreVoiceTarget? target;
  final String? identity;
  final String? toIdentity;
  final String? token;
  final DateTime? expiresAt;
  final int? ttlSec;

  /// Opaque id of the voice_call CDR row. Send it back with call events and as a
  /// connect param so Twilio callbacks land on the right row.
  final String? callId;

  /// Callee's stored number for "switch to a regular call". No masking (owner
  /// decision): when VoIP is not viable the app hands off to the native dialer.
  final String? fallbackPhone;

  /// True for support sessions (agent ringing instead of a single order party).
  final bool support;

  bool get isTwilio => provider == OreVoiceProvider.twilio && (token ?? '').isNotEmpty;

  /// Clean E.164 fallback or null. Backend returns E.164; trim defensively.
  String? get normalizedFallbackPhone {
    final raw = fallbackPhone?.trim() ?? '';
    return raw.isEmpty ? null : raw;
  }

  static OreVoiceSession? tryParse(Object? json) {
    if (json is! Map) return null;
    final row = Map<String, dynamic>.from(json);
    final providerRaw = row['provider']?.toString();
    final provider = providerRaw == 'twilio' ? OreVoiceProvider.twilio : providerRaw == 'log' ? OreVoiceProvider.log : null;
    if (provider == null) return null;
    OreVoiceTarget? target;
    switch (row['target']?.toString()) {
      case 'customer':
        target = OreVoiceTarget.customer;
      case 'rider':
        target = OreVoiceTarget.rider;
      case 'vendor':
        target = OreVoiceTarget.vendor;
      case 'support':
        target = OreVoiceTarget.support;
    }
    final callId = row['callId']?.toString().trim() ?? '';
    final fallbackPhone = row['fallbackPhone']?.toString().trim() ?? '';
    return OreVoiceSession(
      provider: provider,
      target: target,
      identity: row['identity']?.toString(),
      toIdentity: row['toIdentity']?.toString(),
      token: row['token']?.toString(),
      expiresAt: DateTime.tryParse(row['expiresAt']?.toString() ?? ''),
      ttlSec: row['ttlSec'] is num ? (row['ttlSec'] as num).toInt() : null,
      callId: callId.isEmpty ? null : callId,
      fallbackPhone: fallbackPhone.isEmpty ? null : fallbackPhone,
      support: row['support'] == true,
    );
  }
}

/// `GET /comms/support/contact` — what support screens render instead of fake
/// hardcoded numbers.
class OreSupportContact {
  const OreSupportContact({required this.phone, required this.appCallingEnabled});

  /// Public PSTN support line (E.164) or null when not provisioned.
  final String? phone;

  /// In-app VoIP support calling available (Twilio live).
  final bool appCallingEnabled;

  static const OreSupportContact empty = OreSupportContact(phone: null, appCallingEnabled: false);

  static OreSupportContact tryParse(Object? json) {
    if (json is! Map) return empty;
    final row = Map<String, dynamic>.from(json);
    final phone = row['phone']?.toString().trim() ?? '';
    return OreSupportContact(
      phone: phone.isEmpty ? null : phone,
      appCallingEnabled: row['appCallingEnabled'] == true,
    );
  }
}

