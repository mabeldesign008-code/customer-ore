import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ore_core/ore_core.dart';

import '../../providers/auth/vendor_auth_provider.dart';
import '../../providers/vendor_data_provider.dart';

class VendorOrderChatScreen extends ConsumerWidget {
  const VendorOrderChatScreen({super.key, required this.orderId});

  final String orderId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final order = ref.watch(vendorOrderProvider(orderId)).value;
    final userId = ref.watch(vendorAuthProvider).state.user?.id ?? '';
    final storage = ref.watch(vendorTokenStorageProvider);
    final title = order?.customer?.name.trim().isNotEmpty == true
        ? order!.customer!.name
        : 'Order chat';

    return OreOrderChatPage(
      client: ref.watch(vendorApiClientProvider),
      readAccessToken: () async => (await storage.read())?.accessToken,
      orderId: orderId,
      currentUserId: userId,
      title: title,
      subtitle: 'Customer · Rider',
    );
  }
}
