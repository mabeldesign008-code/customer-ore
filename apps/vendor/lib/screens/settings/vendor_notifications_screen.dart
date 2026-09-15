import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:ore_core/ore_core.dart' hide AppColors;

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../providers/vendor_data_provider.dart';
import '../../widgets/common/primary_button.dart';

class VendorNotificationsScreen extends ConsumerWidget {
  const VendorNotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final feed = ref.watch(vendorNotificationsProvider);
    return Scaffold(
      appBar: AppBar(
        title: Text('Notifications', style: AppTextStyles.heading3),
        actions: [IconButton(tooltip: 'Action', onPressed: () => ref.invalidate(vendorNotificationsProvider), icon: const Icon(LucideIcons.refreshCw))],
      ),
      body: feed.when(
        loading: () => const Center(child: CircularProgressIndicator(semanticsLabel: 'Loading')),
        error: (_, __) => Center(child: PrimaryButton(label: 'Retry', onPressed: () => ref.invalidate(vendorNotificationsProvider))),
        data: (rows) => rows.isEmpty
            ? const Center(child: OreEmptyState(icon: LucideIcons.bellOff, title: 'No notifications yet'))
            : ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: rows.length,
                separatorBuilder: (_, __) => const SizedBox(height: 10),
                itemBuilder: (_, index) {
                  final notification = rows[index];
                  return InkWell(
                    onTap: notification.read ? null : () async {
                      await ref.read(vendorNotificationRepositoryProvider).markRead(notification.id);
                      ref.invalidate(vendorNotificationsProvider);
                    },
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: notification.read ? Colors.white : AppColors.primary.withOpacity(0.06),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: notification.read ? AppColors.border : AppColors.primary.withOpacity(0.3)),
                      ),
                      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Icon(notification.read ? LucideIcons.bell : LucideIcons.bellRing, color: AppColors.primary),
                        const SizedBox(width: 12),
                        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(notification.title, style: AppTextStyles.subtitleMedium),
                          const SizedBox(height: 4),
                          Text(notification.body, style: AppTextStyles.bodyMedium),
                          const SizedBox(height: 6),
                          Text(Formatters.formatDate(notification.createdAt), style: AppTextStyles.caption),
                        ])),
                      ]),
                    ),
                  );
                },
              ),
      ),
    );
  }
}
