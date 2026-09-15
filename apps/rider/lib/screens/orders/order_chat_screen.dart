import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ore_core/ore_core.dart';

import '../../data/auth/rider_api_client_provider.dart';
import '../../providers/rider_provider.dart';

class RiderOrderChatScreen extends ConsumerWidget {
  const RiderOrderChatScreen({super.key, required this.orderId});

  final String orderId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final trips = ref.watch(tripsProvider);
    final trip = trips.currentTrip?.id == orderId
        ? trips.currentTrip
        : trips.history.where((row) => row.id == orderId).firstOrNull;
    final rider = ref.watch(riderAuthProvider).state.rider;
    final storage = ref.watch(riderTokenStorageProvider);
    final title = trip == null || trip.customerName.trim().isEmpty || trip.customerName == 'Customer'
        ? 'Order chat'
        : trip.customerName;

    return OreOrderChatPage(
      client: ref.watch(riderApiClientProvider),
      readAccessToken: () async => (await storage.read())?.accessToken,
      orderId: orderId,
      currentUserId: rider?.userId ?? '',
      title: title,
      subtitle: 'Customer · Vendor',
    );
  }
}
