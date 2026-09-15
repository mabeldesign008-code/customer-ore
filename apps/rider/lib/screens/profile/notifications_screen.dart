import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:ore_core/ore_core.dart';

import '../../data/auth/rider_api_client_provider.dart';
import '../../data/notifications/rider_notification_repository.dart';

class RiderNotificationsScreen extends ConsumerWidget {
  const RiderNotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifications = ref.watch(riderNotificationsProvider);
    return Scaffold(
      appBar: AppBar(
        title: Text('Notifications', style: AppTypography.h2()),
        actions: [
          IconButton(tooltip: 'Action', 
            icon: const Icon(LucideIcons.refreshCw),
            onPressed: () => ref.invalidate(riderNotificationsProvider),
          ),
        ],
      ),
      body: notifications.when(
        loading: () => const Center(child: CircularProgressIndicator(semanticsLabel: 'Loading')),
        error: (_, __) => Center(
          child: OreButton(
            label: 'Retry',
            onPressed: () => ref.invalidate(riderNotificationsProvider),
          ),
        ),
        data: (rows) => rows.isEmpty
            ? const Center(child: OreEmptyState(
                icon: LucideIcons.bell,
                title: 'No notifications yet',
              ))
            : RefreshIndicator(
                onRefresh: () async => ref.invalidate(riderNotificationsProvider),
                child: ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: rows.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final notification = rows[index];
                    return _NotificationTile(
                      notification: notification,
                      onTap: () async {
                        if (!notification.read) {
                          await ref
                              .read(riderNotificationRepositoryProvider)
                              .markRead(notification.id);
                          ref.invalidate(riderNotificationsProvider);
                        }
                      },
                    );
                  },
                ),
              ),
      ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({required this.notification, required this.onTap});

  final RiderNotification notification;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: notification.read ? Colors.white : AppColors.primary.withOpacity(0.06),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: notification.read ? AppColors.border : AppColors.primary.withOpacity(0.35),
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(
              notification.read ? LucideIcons.bell : LucideIcons.bellRing,
              color: notification.read ? AppColors.textMuted : AppColors.primary,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(notification.title, style: AppTypography.button()),
                  const SizedBox(height: 4),
                  Text(notification.body, style: AppTypography.body()),
                  const SizedBox(height: 6),
                  Text(
                    notification.createdAt.toLocal().toString().split('.').first,
                    style: AppTypography.caption(AppColors.textMuted),
                  ),
                ],
              ),
            ),
            if (!notification.read)
              const Padding(
                padding: EdgeInsets.only(left: 8, top: 4),
                child: CircleAvatar(radius: 4, backgroundColor: AppColors.primary),
              ),
          ],
        ),
      ),
    );
  }
}
