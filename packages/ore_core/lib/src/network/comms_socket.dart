import 'dart:async';

import 'package:socket_io_client/socket_io_client.dart' as io;

import 'comms_models.dart';
import 'endpoints.dart';

enum OreCommsConnection {
  disconnected,
  connecting,
  connected,
  subscribed,
}

/// Socket.IO client for `/comms` using the same JWT as HTTP.
///
/// Connects to `$baseUrl/comms` with Engine.IO path
/// [OreEndpoints.commsSocketPath] so the API gateway can proxy it.
class OreCommsSocket {
  OreCommsSocket({
    required this.baseUrl,
    required this.readAccessToken,
  });

  final String baseUrl;
  final Future<String?> Function() readAccessToken;

  io.Socket? _socket;
  String? _threadId;
  OreCommsConnection _connection = OreCommsConnection.disconnected;
  final StreamController<OreCommsMessage> _messages = StreamController.broadcast();
  final StreamController<OreCommsConnection> _states = StreamController.broadcast();

  Stream<OreCommsMessage> get messages => _messages.stream;
  Stream<OreCommsConnection> get states => _states.stream;
  OreCommsConnection get connection => _connection;
  bool get isLive => _connection == OreCommsConnection.subscribed;

  Future<void> subscribe(String threadId) async {
    await disconnect();
    final token = await readAccessToken();
    if (token == null || token.isEmpty) {
      _setState(OreCommsConnection.disconnected);
      return;
    }

    _threadId = threadId;
    _setState(OreCommsConnection.connecting);
    final origin = baseUrl.endsWith('/') ? baseUrl.substring(0, baseUrl.length - 1) : baseUrl;
    final socket = io.io(
      '$origin${OreEndpoints.commsSocketNamespace}',
      <String, dynamic>{
        'path': OreEndpoints.commsSocketPath,
        'auth': <String, String>{'token': token},
        'transports': <String>['websocket', 'polling'],
        'autoConnect': false,
        'reconnection': true,
        'forceNew': true,
      },
    );
    _socket = socket;
    socket.onConnect((_) {
      if (_socket != socket) return;
      _setState(OreCommsConnection.connected);
      socket.emit('subscribe', <String, String>{'threadId': threadId});
    });
    socket.on('subscribed', (_) {
      if (_socket != socket) return;
      _setState(OreCommsConnection.subscribed);
    });
    socket.on('message', (data) {
      if (_socket != socket || _messages.isClosed) return;
      final parsed = OreCommsMessage.tryParse(data);
      if (parsed != null) _messages.add(parsed);
    });
    socket.onDisconnect((_) {
      if (_socket != socket) return;
      _setState(OreCommsConnection.disconnected);
    });
    socket.onConnectError((_) {
      if (_socket != socket) return;
      _setState(OreCommsConnection.disconnected);
    });
    socket.onError((_) {
      if (_socket != socket) return;
      _setState(OreCommsConnection.disconnected);
    });
    socket.connect();
  }

  Future<void> disconnect() async {
    final socket = _socket;
    final threadId = _threadId;
    _socket = null;
    _threadId = null;
    if (socket != null) {
      if (threadId != null) {
        socket.emit('unsubscribe', <String, String>{'threadId': threadId});
      }
      socket.dispose();
    }
    _setState(OreCommsConnection.disconnected);
  }

  Future<void> dispose() async {
    await disconnect();
    await _messages.close();
    await _states.close();
  }

  void _setState(OreCommsConnection next) {
    if (_connection == next) return;
    _connection = next;
    if (!_states.isClosed) _states.add(next);
  }
}
