import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:ore_core/ore_core.dart';

class RiderLocationSample {
  const RiderLocationSample({
    required this.lat,
    required this.lng,
    required this.speedKmh,
    this.orderId,
  });

  final double lat;
  final double lng;
  final double speedKmh;
  final String? orderId;

  Map<String, dynamic> toJson() => <String, dynamic>{
        'lat': lat,
        'lng': lng,
        'speedKmh': speedKmh,
        if (orderId != null) 'orderId': orderId,
      };

  factory RiderLocationSample.fromJson(Map<String, dynamic> json) {
    return RiderLocationSample(
      lat: (json['lat'] as num).toDouble(),
      lng: (json['lng'] as num).toDouble(),
      speedKmh: (json['speedKmh'] as num).toDouble(),
      orderId: json['orderId'] as String?,
    );
  }
}

/// Encrypted local queue for GPS samples that could not reach the backend.
class RiderLocationQueue {
  RiderLocationQueue({FlutterSecureStorage? storage})
      : _storage = storage ?? FlutterSecureStorage();

  static const _key = 'rider_pending_location_samples';
  static const _maxSamples = 100;
  final FlutterSecureStorage _storage;

  Future<List<RiderLocationSample>> read() async {
    final raw = await _storage.read(key: _key);
    if (raw == null || raw.isEmpty) return <RiderLocationSample>[];
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! List) return <RiderLocationSample>[];
      return decoded
          .whereType<Map>()
          .map((item) => RiderLocationSample.fromJson(
                Map<String, dynamic>.from(item),
              ))
          .toList();
    } catch (_) {
      await clear();
      return <RiderLocationSample>[];
    }
  }

  Future<void> write(List<RiderLocationSample> samples) async {
    final trimmed = samples.length <= _maxSamples
        ? samples
        : samples.sublist(samples.length - _maxSamples);
    await _storage.write(
      key: _key,
      value: jsonEncode(trimmed.map((sample) => sample.toJson()).toList()),
    );
  }

  Future<void> clear() => _storage.delete(key: _key);
}

/// Tracking-service client for authenticated rider GPS updates.
class RiderTrackingRepository {
  RiderTrackingRepository(
    this._client, {
    RiderLocationQueue? queue,
  }) : _queue = queue ?? RiderLocationQueue();

  final OreApiClient _client;
  final RiderLocationQueue _queue;

  Future<void> updateLocation({
    required double lat,
    required double lng,
    required double speedKmh,
    String? orderId,
  }) async {
    await _client.post<Map<String, dynamic>>(
      OreEndpoints.updateLocation,
      data: <String, dynamic>{
        'lat': lat,
        'lng': lng,
        'speedKmh': speedKmh,
        if (orderId != null) 'orderId': orderId,
      },
    );
  }

  /// Sends pending samples first, then the newest sample. If any request fails,
  /// the remaining samples and current sample are retained for retry.
  Future<void> sendOrQueue(RiderLocationSample current) async {
    final pending = await _queue.read();
    try {
      for (final sample in pending) {
        await updateLocation(
          lat: sample.lat,
          lng: sample.lng,
          speedKmh: sample.speedKmh,
          orderId: sample.orderId,
        );
      }
      await updateLocation(
        lat: current.lat,
        lng: current.lng,
        speedKmh: current.speedKmh,
        orderId: current.orderId,
      );
      await _queue.clear();
    } catch (_) {
      await _queue.write(<RiderLocationSample>[...pending, current]);
    }
  }
}
