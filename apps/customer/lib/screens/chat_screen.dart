import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ore_core/ore_core.dart';

import '../providers/customer_auth_provider.dart';

/// Order-thread chat, or Ore Support when [isSupport] / [orderId] is empty.
/// Empty thread stays empty — no fabricated agent replies.
class ChatScreen extends ConsumerWidget {
  const ChatScreen({
    super.key,
    required this.orderId,
    required this.riderName,
    this.isSupport = false,
  });

  final String orderId;
  final String riderName;
  final bool isSupport;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final userId = ref.watch(customerAuthProvider).user?.id ?? '';
    final storage = ref.watch(customerTokenStorageProvider);
    final support = isSupport || orderId.trim().isEmpty;
    return OreOrderChatPage(
      client: ref.watch(customerApiClientProvider),
      readAccessToken: () async => (await storage.read())?.accessToken,
      orderId: support ? '' : orderId,
      kind: support ? OreCommsThreadKind.support : OreCommsThreadKind.order,
      currentUserId: userId,
      title: support
          ? 'Ore Support'
          : (riderName.trim().isEmpty ? 'Order chat' : riderName),
      subtitle: support ? 'Ore Support' : 'Order messages',
    );
  }
}
