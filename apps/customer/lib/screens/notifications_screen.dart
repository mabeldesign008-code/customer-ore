import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_slidable/flutter_slidable.dart';
import 'package:go_router/go_router.dart';
import 'package:skeletonizer/skeletonizer.dart';
import 'package:ore_core/ore_core.dart';

import '../core/ui/toast_x.dart';
import '../providers/customer_auth_provider.dart';
import '../providers/notifications_provider.dart';

class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(customerNotificationServiceProvider).initialize();
      _refresh();
    });
  }

  Future<void> _refresh() async {
    HapticFeedback.selectionClick();
    if (mounted) setState(() { _loading = true; _error = null; });
    try {
      await ref.read(notificationsProvider.notifier).hydrate();
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
    HapticFeedback.lightImpact();
  }

  @override
  Widget build(BuildContext context) {
    final notifs = ref.watch(notificationsProvider);
    final notifier = ref.read(notificationsProvider.notifier);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(children: [
          // ── App bar ──────────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(8, 8, 16, 8),
            child: Row(children: [
              IconButton(tooltip: 'Action', 
                onPressed: () => context.pop(),
                icon: const Icon(Icons.arrow_back_ios_new_rounded),
              ),
              Expanded(
                child: Text('Notifications',
                    style: AppTypography.h3()),
              ),
              if (notifs.any((n) => !n.isRead))
                TextButton(
                  onPressed: () {
                    HapticFeedback.selectionClick();
                    notifier.markAllRead();
                    context.showToast('All notifications marked as read',
                        type: ToastType.success);
                  },
                  child: const Text('Mark all read'),
                ),
            ]),
          ),

          // ── List ─────────────────────────────────────────────────────
          Expanded(
            child: RefreshIndicator(
              onRefresh: _refresh,
              color: AppColors.primary,
              displacement: 24,
              edgeOffset: 0,
              child: Skeletonizer(
                enabled: _loading,
                child: _loading || notifs.isEmpty
                    ? _loading
                        ? ListView.builder(
                            physics: const AlwaysScrollableScrollPhysics(),
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            itemCount: 6,
                            itemBuilder: (_, __) => _skeletonTile(),
                          )
                        : ListView(
                            physics: const AlwaysScrollableScrollPhysics(),
                            children: [
                              const SizedBox(height: 80),
                              OreEmptyState(
                                icon: Icons.notifications_off_outlined,
                                title: 'No notifications yet',
                                subtitle: _error ??
                                    'We\'ll let you know when orders, promos or updates arrive.',
                              ),
                            ],
                          )
                    : ListView.builder(
                        padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                        itemCount: notifs.length,
                        itemBuilder: (context, i) {
                          final n = notifs[i];
                          return Slidable(
                            key: ValueKey(n.id),
                            endActionPane: ActionPane(
                              extentRatio: 0.25,
                              motion: const StretchMotion(),
                              dismissible: DismissiblePane(
                                onDismissed: () {
                                  HapticFeedback.heavyImpact();
                                  notifier.dismiss(n.id);
                                  context.showToast('Notification dismissed',
                                      type: ToastType.info);
                                },
                              ),
                              children: [
                                SlidableAction(
                                  onPressed: (_) {
                                    HapticFeedback.heavyImpact();
                                    notifier.dismiss(n.id);
                                    context.showToast('Notification removed',
                                        type: ToastType.info);
                                  },
                                  backgroundColor: AppColors.danger,
                                  foregroundColor: Colors.white,
                                  icon: Icons.delete_outline_rounded,
                                  label: 'Delete',
                                  borderRadius: BorderRadius.circular(12),
                                  padding: EdgeInsets.zero,
                                ),
                              ],
                            ),
                            child: Container(
                              margin: const EdgeInsets.only(bottom: 10),
                              decoration: BoxDecoration(
                                color: n.isRead ? Colors.white : AppColors.primary.withOpacity(0.06),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: n.isRead ? AppColors.border : AppColors.primary.withOpacity(0.2),
                                ),
                              ),
                              child: AnimatedPress(
                                borderRadius: BorderRadius.circular(16),
                                onTap: () => notifier.markRead(n.id),
                                child: ListTile(
                                  contentPadding: const EdgeInsets.symmetric(
                                      horizontal: 16, vertical: 8),
                                  leading: Container(
                                    width: 44,
                                    height: 44,
                                    decoration: BoxDecoration(
                                      color: n.type.iconColor.withOpacity(0.12),
                                      shape: BoxShape.circle,
                                    ),
                                    child: Icon(n.type.icon,
                                        color: n.type.iconColor, size: 20),
                                  ),
                                  title: Text(
                                    n.title,
                                    style: AppTypography.body().copyWith(
                                      fontWeight: n.isRead ? FontWeight.w600 : FontWeight.w700,
                                    ),
                                  ),
                                  subtitle: Padding(
                                    padding: const EdgeInsets.only(top: 4),
                                    child: Text(n.body,
                                        style: AppTypography.bodySm()),
                                  ),
                                  trailing: Column(
                                    mainAxisAlignment: MainAxisAlignment.start,
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      Text(n.timeAgo,
                                          style: AppTypography.caption(
                                              AppColors.textMuted)),
                                      if (!n.isRead) ...[
                                        const SizedBox(height: 6),
                                        Container(
                                          width: 8,
                                          height: 8,
                                          decoration: const BoxDecoration(
                                            color: AppColors.primary,
                                            shape: BoxShape.circle,
                                          ),
                                        ),
                                      ]
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          )
                              .animate(delay: Duration(milliseconds: 40 * i))
                              .fadeIn(duration: 350.ms)
                              .slideY(begin: 0.15, end: 0, curve: Curves.easeOutCubic);
                        },
                      ),
              ),
            ),
          ),
        ]),
      ),
    );
  }

  Widget _skeletonTile() => Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(children: [
          const CircleAvatar(radius: 22, backgroundColor: Colors.white),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(height: 12, width: 160, color: Colors.white),
                const SizedBox(height: 8),
                Container(height: 10, width: double.infinity, color: Colors.white),
                const SizedBox(height: 4),
                Container(height: 10, width: 200, color: Colors.white),
              ],
            ),
          ),
        ]),
      );

  Color _colorFor(String t) => switch (t) {
        'promo' => AppColors.accent,
        'order' => AppColors.primary,
        'payment' => AppColors.success,
        _ => AppColors.info,
      };

  IconData _iconFor(String t) => switch (t) {
        'promo' => Icons.card_giftcard_rounded,
        'order' => Icons.inventory_2_rounded,
        'payment' => Icons.account_balance_wallet_rounded,
        _ => Icons.notifications_outlined,
      };
}
