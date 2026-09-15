import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Exposes a stream of connectivity state so UI can show offline banners.
final connectivityProvider = StreamProvider<bool>((ref) {
  final controller = StreamController<bool>.broadcast();
  final conn = Connectivity();
  conn.checkConnectivity().then((r) => controller.add(_hasNet(r)));
  final sub = conn.onConnectivityChanged
      .listen((r) => controller.add(_hasNet(r)));
  ref.onDispose(() {
    sub.cancel();
    controller.close();
  });
  return controller.stream;
});

bool _hasNet(List<ConnectivityResult> r) =>
    r.any((c) => c != ConnectivityResult.none);
