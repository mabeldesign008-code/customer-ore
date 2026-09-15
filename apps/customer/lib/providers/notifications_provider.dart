import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ore_core/ore_core.dart';

import 'customer_auth_provider.dart';

// ── Notification type ─────────────────────────────────────────────────────

enum NotificationType { orderUpdate, promo, system, riderUpdate }

extension NotificationTypeX on NotificationType {
  IconData get icon {
    switch (this) {
      case NotificationType.orderUpdate:
        return Icons.shopping_bag_outlined;
      case NotificationType.promo:
        return Icons.local_offer_outlined;
      case NotificationType.system:
        return Icons.notifications_outlined;
      case NotificationType.riderUpdate:
        return Icons.pedal_bike_rounded;
    }
  }

  Color get iconColor {
    switch (this) {
      case NotificationType.orderUpdate:
        return AppColors.primary;
      case NotificationType.promo:
        return AppColors.warning;
      case NotificationType.system:
        return const Color(0xFF8B5CF6);
      case NotificationType.riderUpdate:
        return AppColors.success;
    }
  }

  Color get iconBg {
    switch (this) {
      case NotificationType.orderUpdate:
        return AppColors.primary.withOpacity(0.1);
      case NotificationType.promo:
        return const Color(0xFFFEF3C7);
      case NotificationType.system:
        return const Color(0xFFF5F3FF);
      case NotificationType.riderUpdate:
        return const Color(0xFFF0FDF4);
    }
  }
}

// ── Model ─────────────────────────────────────────────────────────────────

class AppNotification {
  final String id;
  final String title;
  final String body;
  final DateTime createdAt;
  final bool isRead;
  final String? orderId;
  final NotificationType type;
  final ServiceType? serviceType;

  const AppNotification({
    required this.id,
    required this.title,
    required this.body,
    required this.createdAt,
    this.isRead = false,
    this.orderId,
    this.type = NotificationType.orderUpdate,
    this.serviceType,
  });

  AppNotification copyWith({bool? isRead}) => AppNotification(
        id: id,
        title: title,
        body: body,
        createdAt: createdAt,
        isRead: isRead ?? this.isRead,
        orderId: orderId,
        type: type,
        serviceType: serviceType,
      );

  String get timeAgo {
    final diff = DateTime.now().difference(createdAt);
    if (diff.inSeconds < 60) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes} min ago';
    if (diff.inHours < 24) return '${diff.inHours} hr ago';
    return '${diff.inDays} day${diff.inDays > 1 ? 's' : ''} ago';
  }
}

// ── Notifier ──────────────────────────────────────────────────────────────

class NotificationsNotifier extends Notifier<List<AppNotification>> {
  Future<void>? _hydrateFuture;

  @override
  List<AppNotification> build() {
    if (ref.watch(customerAuthProvider).isAuthenticated) {
      unawaited(hydrate().catchError((_) {}));
    }
    final subscription = ref.read(customerNotificationServiceProvider).events.listen((_) {
      unawaited(hydrate().catchError((_) {}));
    });
    ref.onDispose(subscription.cancel);
    // Notifications are loaded from the Notification service. Do not seed
    // demo promos here: an empty backend feed must look empty, not successful.
    return const <AppNotification>[];
  }

  Future<void> hydrate() {
    final inFlight = _hydrateFuture;
    if (inFlight != null) return inFlight;
    if (!ref.read(customerAuthProvider).isAuthenticated) {
      return Future<void>.value();
    }
    final future = _loadFeed();
    _hydrateFuture = future;
    future.then<void>(
      (_) {
        if (identical(_hydrateFuture, future)) _hydrateFuture = null;
      },
      onError: (Object error, StackTrace stack) {
        if (identical(_hydrateFuture, future)) _hydrateFuture = null;
      },
    );
    return future;
  }

  Future<void> _loadFeed() async {
    final rows = await ref.read(customerNotificationRepositoryProvider).getFeed();
    state = rows.map(_fromBackend).toList(growable: false);
  }

  AppNotification _fromBackend(Map<String, dynamic> json) {
    final type = (json['type'] as String? ?? '').toLowerCase();
    final data = json['dataJson'] is Map ? Map<String, dynamic>.from(json['dataJson'] as Map) : <String, dynamic>{};
    return AppNotification(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      body: json['body'] as String? ?? '',
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ?? DateTime.now(),
      isRead: json['read'] as bool? ?? false,
      orderId: data['orderId'] as String?,
      type: type.contains('promo') ? NotificationType.promo : type.contains('rider') ? NotificationType.riderUpdate : NotificationType.orderUpdate,
    );
  }

  void add(AppNotification notification) {
    state = [notification, ...state];
  }

  void markRead(String id) {
    state = [
      for (final n in state)
        if (n.id == id) n.copyWith(isRead: true) else n,
    ];
    if (ref.read(customerAuthProvider).isAuthenticated) {
      unawaited(ref.read(customerNotificationRepositoryProvider).markRead(id));
    }
  }

  void markAllRead() {
    final ids = state.where((n) => !n.isRead).map((n) => n.id).toList(growable: false);
    state = [for (final n in state) n.copyWith(isRead: true)];
    if (ref.read(customerAuthProvider).isAuthenticated) {
      for (final id in ids) unawaited(ref.read(customerNotificationRepositoryProvider).markRead(id));
    }
  }

  void dismiss(String id) {
    state = state.where((n) => n.id != id).toList();
  }

  void clearAll() => state = [];

  int get unreadCount => state.where((n) => !n.isRead).length;
}

final notificationsProvider =
    NotifierProvider<NotificationsNotifier, List<AppNotification>>(
        NotificationsNotifier.new);

/// Convenience derived provider — just the unread count, so widgets that only
/// need the badge don't rebuild on every notification content change.
final notificationUnreadCountProvider = Provider<int>((ref) {
  final notifications = ref.watch(notificationsProvider);
  return notifications.where((n) => !n.isRead).length;
});
