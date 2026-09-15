import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ore_core/ore_core.dart';

import '../../data/auth/rider_api_client_provider.dart';
import '../../providers/rider_provider.dart';

/// Ore Support inbox for this rider account. Empty = empty. No bot.
class RiderSupportChatScreen extends ConsumerWidget {
  const RiderSupportChatScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final rider = ref.watch(riderAuthProvider).state.rider;
    final storage = ref.watch(riderTokenStorageProvider);
    return OreOrderChatPage(
      client: ref.watch(riderApiClientProvider),
      readAccessToken: () async => (await storage.read())?.accessToken,
      kind: OreCommsThreadKind.support,
      currentUserId: rider?.userId ?? '',
      title: 'Ore Support',
      subtitle: 'Rider support',
    );
  }
}
