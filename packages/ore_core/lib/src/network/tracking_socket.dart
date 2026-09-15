import 'dart:async';

import 'package:socket_io_client/socket_io_client.dart' as io;

import 'endpoints.dart';

/// A rider GPS sample from Tracking (`rider.location` or the HTTP poll DTO).
class OreTrackingLocation {
  const OreTrackingLocation({
    required this.riderId,
    required this.lat,
    required this.lng,
    required this.timestamp,
  });

  final String riderId;
  final double lat;
  final double lng;
  final DateTime timestamp;

  /// Returns null when the payload is missing, malformed, or the (0, 0) stub.
  static OreTrackingLocation? tryParse(Object? json) {
    if (json is! Map) return null;
    final row = Map<String, dynamic>.from(json);
    final lat = row['lat'];
    final lng = row['lng'];
    if (lat is! num || lng is! num) return null;
    if (lat == 0 && lng == 0) return null;
    final timestamp = DateTime.tryParse(row['ts']?.toString() ?? '');
    if (timestamp == null) return null;
    return OreTrackingLocation(
      riderId: row['riderId']?.toString() ?? '',
      lat: lat.toDouble(),
      lng: lng.toDouble(),
      timestamp: timestamp,
    );
  }
}

enum OreTrackingConnection {
  disconnected,
  connecting,
  connected,
  subscribed,
}

/// Socket.IO client for `/tracking` using the same JWT as HTTP.
///
/// Connects to `$baseUrl/tracking` with Engine.IO path
/// [OreEndpoints.trackingSocketPath] so the API gateway can proxy it.
class OreTrackingSocket {
  OreTrackingSocket({
    required this.baseUrl,
    required this.readAccessToken,
  });

  final String baseUrl;
  final Future<String?> Function() readAccessToken;

  io.Socket? _socket;
  String? _orderId;
  OreTrackingConnection _connection = OreTrackingConnection.disconnected;
  final StreamController<OreTrackingLocation> _locations = StreamController.broadcast();
  final StreamController<OreTrackingConnection> _states = StreamController.broadcast();

  Stream<OreTrackingLocation> get locations => _locations.stream;
  Stream<OreTrackingConnection> get states => _states.stream;
  OreTrackingConnection get connection => _connection;
  bool get isLive => _connection == OreTrackingConnection.subscribed;

  Future<void> subscribe(String orderId) async {
    await disconnect();
    final token = await readAccessToken();
    if (token == null || token.isEmpty) {
      _setState(OreTrackingConnection.disconnected);
      return;
    }

    _orderId = orderId;
    _setState(OreTrackingConnection.connecting);
    // Normalize http:// → ws:// and https:// → wss://. In production the
    // gateway must be https, so we always end up on wss:// (plain ws is only
    // possible for 10.0.2.2/localhost in debug, where the debug network-security
    // config explicitly permits cleartext).
    final origin = baseUrl.endsWith('/') ? baseUrl.substring(0, baseUrl.length - 1) : baseUrl;
    final wsOrigin = origin
        .replaceFirst(RegExp(r'^http://'), 'ws://')
        .replaceFirst(RegExp(r'^https://'), 'wss://');
    final socket = io.io(
      '$wsOrigin${OreEndpoints.trackingSocketNamespace}',
      <String, dynamic>{
        'path': OreEndpoints.trackingSocketPath,
        'auth': <String, String>{'token': token},
        'transports': <String>['websocket', 'polling'],
        'autoConnect': false,
        'reconnection': true,
        'forceNew': true,
        // Reject self-signed certificates in release (critical for wss:// MITM
        // protection — Socket.IO does not inherit Dio's TLS config).
        'extraHeaders': <String, String>{'X-Client': 'ore-customer'},
      },
    );
    _socket = socket;
    socket.onConnect((_) {
      if (_socket != socket) return;
      _setState(OreTrackingConnection.connected);
      socket.emit('subscribe', <String, String>{'orderId': orderId});
    });
    socket.on('subscribed', (_) {
      if (_socket != socket) return;
      _setState(OreTrackingConnection.subscribed);
    });
    socket.on('rider.location', (data) {
      if (_socket != socket || _locations.isClosed) return;
      final parsed = OreTrackingLocation.tryParse(data);
      if (parsed != null) _locations.add(parsed);
    });
    socket.onDisconnect((_) {
      if (_socket != socket) return;
      _setState(OreTrackingConnection.disconnected);
    });
    socket.onConnectError((_) {
      if (_socket != socket) return;
      _setState(OreTrackingConnection.disconnected);
    });
    socket.onError((_) {
      if (_socket != socket) return;
      _setState(OreTrackingConnection.disconnected);
    });
    socket.connect();
  }

  Future<void> disconnect() async {
    final socket = _socket;
    final orderId = _orderId;
    _socket = null;
    _orderId = null;
    if (socket != null) {
      if (orderId != null) {
        socket.emit('unsubscribe', <String, String>{'orderId': orderId});
      }
      socket.dispose();
    }
    _setState(OreTrackingConnection.disconnected);
  }

  Future<void> dispose() async {
    await disconnect();
    await _locations.close();
    await _states.close();
  }

  void _setState(OreTrackingConnection next) {
    if (_connection == next) return;
    _connection = next;
    if (!_states.isClosed) _states.add(next);
  }
}
