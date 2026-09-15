import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ore_core/ore_core.dart';

import '../../providers/auth/vendor_auth_provider.dart';

/// Ore Support inbox for this vendor account. Empty = empty. No bot.
class SupportChatScreen extends ConsumerWidget {
  const SupportChatScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final userId = ref.watch(vendorAuthProvider).state.user?.id ?? '';
    final storage = ref.watch(vendorTokenStorageProvider);
    return OreOrderChatPage(
      client: ref.watch(vendorApiClientProvider),
      readAccessToken: () async => (await storage.read())?.accessToken,
      kind: OreCommsThreadKind.support,
      currentUserId: userId,
      title: 'Ore Support',
      subtitle: 'Vendor support',
    );
  }
}
