import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:ore_core/ore_core.dart' hide AppColors;

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/router/app_router.dart';
import '../../data/order/vendor_order_repository.dart';
import '../../providers/vendor_data_provider.dart';

class VendorOrdersTab extends ConsumerStatefulWidget {
  const VendorOrdersTab({super.key});

  @override
  ConsumerState<VendorOrdersTab> createState() => _VendorOrdersTabState();
}

class _VendorOrdersTabState extends ConsumerState<VendorOrdersTab> {
  Timer? _pollTimer;

  @override
  void initState() {
    super.initState();
    _pollTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      final snapshot = ref.read(vendorSnapshotProvider).value;
      if (snapshot != null) ref.invalidate(vendorOrdersProvider(snapshot.vendor.id));
    });
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final snapshot = ref.watch(vendorSnapshotProvider);
    return snapshot.when(
      loading: () => const Scaffold(body: Center(child: CircularProgressIndicator(semanticsLabel: 'Loading'))),
      error: (_, __) => Scaffold(
        appBar: AppBar(title: Text('Orders', style: AppTypography.h2())),
        body: Center(
          child: OreButton(
            label: 'Retry',
            onPressed: () => ref.invalidate(vendorSnapshotProvider),
          ),
        ),
      ),
      data: (vendor) {
        final orders = ref.watch(vendorOrdersProvider(vendor.vendor.id));
        return orders.when(
          loading: () => const Scaffold(body: Center(child: CircularProgressIndicator(semanticsLabel: 'Loading'))),
          error: (_, __) => Scaffold(
            appBar: AppBar(title: Text('Orders', style: AppTypography.h2())),
            body: Center(
              child: OreButton(
                label: 'Retry',
                onPressed: () => ref.invalidate(vendorOrdersProvider(vendor.vendor.id)),
              ),
            ),
          ),
          data: (rows) => _VendorOrdersTabs(
            orders: rows,
            onRefresh: () => ref.invalidate(vendorOrdersProvider(vendor.vendor.id)),
          ),
        );
      },
    );
  }
}

class _VendorOrdersTabs extends StatefulWidget {
  const _VendorOrdersTabs({required this.orders, required this.onRefresh});

  final List<VendorOrder> orders;
  final VoidCallback onRefresh;

  @override
  State<_VendorOrdersTabs> createState() => _VendorOrdersTabsState();
}

class _VendorOrdersTabsState extends State<_VendorOrdersTabs> {
  final _search = TextEditingController();
  Set<String> _seenConfirmed = <String>{};
  bool _heardInitial = false;

  @override
  void initState() {
    super.initState();
    _seenConfirmed = widget.orders.where((order) => order.status == 'CONFIRMED').map((order) => order.orderId).toSet();
  }

  @override
  void didUpdateWidget(covariant _VendorOrdersTabs oldWidget) {
    super.didUpdateWidget(oldWidget);
    final confirmed = widget.orders.where((order) => order.status == 'CONFIRMED').map((order) => order.orderId).toSet();
    if (_heardInitial && confirmed.difference(_seenConfirmed).isNotEmpty) {
      SystemSound.play(SystemSoundType.alert);
      HapticFeedback.heavyImpact();
    }
    _seenConfirmed = confirmed;
    _heardInitial = true;
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  List<VendorOrder> _filter(Iterable<VendorOrder> source) {
    final query = _search.text.trim().toLowerCase();
    if (query.isEmpty) return source.toList();
    return source.where((order) {
      return order.ref.toLowerCase().contains(query) ||
          order.orderId.toLowerCase().contains(query) ||
          order.items.any((item) => item.name.toLowerCase().contains(query)) ||
          (order.customer?.phone.toLowerCase().contains(query) ?? false);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 4,
      child: Scaffold(
        appBar: AppBar(
          title: Text('Orders', style: AppTypography.h2()),
          actions: [IconButton(tooltip: 'Action', onPressed: widget.onRefresh, icon: const Icon(LucideIcons.refreshCw))],
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(104),
            child: Column(children: [
              Padding(padding: const EdgeInsets.fromLTRB(16, 0, 16, 8), child: TextField(controller: _search, onChanged: (_) => setState(() {}), decoration: const InputDecoration(prefixIcon: Icon(LucideIcons.search), hintText: 'Search order, item or customer phone', isDense: true, filled: true, fillColor: Colors.white))),
              const TabBar(labelColor: AppColors.primary, indicatorColor: AppColors.primary, tabs: [Tab(text: 'New'), Tab(text: 'Preparing'), Tab(text: 'Ready'), Tab(text: 'Done')]),
            ]),
          ),
        ),
        body: Column(
          children: [
            if (widget.orders.any((order) => order.status == 'CONFIRMED'))
              Material(
                color: AppColors.primary,
                child: ListTile(
                  leading: const Icon(LucideIcons.bell, color: Colors.white),
                  title: Text(
                    '${widget.orders.where((order) => order.status == 'CONFIRMED').length} new order${widget.orders.where((order) => order.status == 'CONFIRMED').length == 1 ? '' : 's'} waiting',
                    style: AppTextStyles.subtitleMedium.copyWith(color: Colors.white),
                  ),
                  subtitle: Text('Accept from the New tab. Sound plays when another live order arrives.', style: AppTextStyles.caption.copyWith(color: Colors.white70)),
                ),
              ),
            Expanded(
              child: TabBarView(
          children: [
            _OrderList(orders: _filter(widget.orders.where((o) => o.status == 'CONFIRMED')), onRefresh: widget.onRefresh),
            _OrderList(orders: _filter(widget.orders.where((o) => o.status == 'ACCEPTED' || o.status == 'PREPARING')), onRefresh: widget.onRefresh),
            _OrderList(orders: _filter(widget.orders.where((o) => const [
                  'READY_FOR_PICKUP',
                  'WAITING_FOR_RIDER',
                  'RIDER_ASSIGNED',
                  'RIDER_EN_ROUTE_TO_VENDOR',
                  'RIDER_AT_VENDOR',
                  'PICKED_UP',
                  'OUT_FOR_DELIVERY',
                  'OTP_VERIFIED',
                ].contains(o.status))), onRefresh: widget.onRefresh),
            _OrderList(orders: _filter(widget.orders.where((o) => const ['DELIVERED', 'REJECTED', 'CANCELLED'].contains(o.status))), onRefresh: widget.onRefresh),
          ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _OrderList extends ConsumerWidget {
  const _OrderList({required this.orders, required this.onRefresh});

  final List<VendorOrder> orders;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (orders.isEmpty) {
      return Center(
        child: OreEmptyState(
          icon: LucideIcons.inbox,
          title: 'No orders in this stage',
          ctaLabel: 'Refresh',
          onCta: onRefresh,
        ),
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: orders.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (_, index) => _OrderCard(order: orders[index], onRefresh: onRefresh),
    );
  }
}

class _OrderCard extends ConsumerWidget {
  const _OrderCard({required this.order, required this.onRefresh});

  final VendorOrder order;
  final VoidCallback onRefresh;

  Future<void> _action(BuildContext context, WidgetRef ref, Future<VendorOrder> Function() action) async {
    try {
      await action();
      onRefresh();
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Order updated')));
      }
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Unable to update order')));
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final repo = ref.read(vendorOrderRepositoryProvider);
    return InkWell(
      onTap: () => context.push(VendorRoutes.orderDetail.replaceFirst(':id', order.orderId)),
      borderRadius: BorderRadius.circular(16),
      child: Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(order.ref, style: AppTextStyles.subtitle)),
              Text(order.status, style: AppTextStyles.captionBold.copyWith(color: AppColors.primary)),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            order.items.map((item) {
              final options = item.selectedOptions.map((option) => option['optionName']?.toString()).whereType<String>().join(', ');
              return '${item.qty}× ${item.name}${options.isEmpty ? '' : ' ($options)'}';
            }).join(' • '),
            style: AppTextStyles.bodyMedium,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          if (order.scheduledFor != null || order.leaveAtDoor) ...[
            const SizedBox(height: 6),
            Text(
              [
                if (order.scheduledFor != null) 'Scheduled ${Formatters.formatDate(order.scheduledFor!)}',
                if (order.leaveAtDoor) 'Leave at door',
              ].join(' · '),
              style: AppTextStyles.caption.copyWith(color: AppColors.warning),
            ),
          ],
          const SizedBox(height: 8),
          Row(
            children: [
              Text(Formatters.money(order.totalPesewas / 100), style: AppTextStyles.subtitleMedium),
              const SizedBox(width: 12),
              Text(order.paymentMethod, style: AppTextStyles.caption),
              const Spacer(),
              Text(Formatters.formatDate(order.createdAt), style: AppTextStyles.caption),
            ],
          ),
          const SizedBox(height: 12),
          if (order.prescriptionRequired && order.prescriptionStatus == 'SUBMITTED')
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () => _action(context, ref, () => repo.approvePrescription(order.orderId)),
                icon: const Icon(LucideIcons.fileCheck, size: 16),
                label: const Text('Approve prescription'),
              ),
            )
          else if (order.prescriptionRequired && order.prescriptionStatus != 'APPROVED')
            Text('Prescription status: ${order.prescriptionStatus}', style: AppTextStyles.caption.copyWith(color: AppColors.warning))
          else if (order.status == 'CONFIRMED')
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => _action(context, ref, () => repo.reject(order.orderId)),
                    child: const Text('Reject'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => _action(context, ref, () => repo.accept(order.orderId)),
                    child: const Text('Accept'),
                  ),
                ),
              ],
            )
          else if (order.status == 'ACCEPTED' || order.status == 'PREPARING')
            Row(children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => _action(context, ref, () => repo.delay(order.orderId, 5)),
                  child: const Text('+5 min'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                flex: 2,
                child: ElevatedButton(
                  onPressed: () => _action(context, ref, () => repo.ready(order.orderId)),
                  child: const Text('Mark ready'),
                ),
              ),
            ])
          else if (order.status == 'READY_FOR_PICKUP' || order.status == 'WAITING_FOR_RIDER')
            Text('Waiting for Dispatch pickup', style: AppTextStyles.caption.copyWith(color: AppColors.success))
          else if (const ['RIDER_ASSIGNED', 'RIDER_EN_ROUTE_TO_VENDOR', 'RIDER_AT_VENDOR'].contains(order.status))
            Text(
              [
                order.rider == null ? 'Rider assigned' : 'Rider assigned: ${order.rider!.name}',
                if (order.etaMinutes != null && order.etaMinutes! > 0) '~${order.etaMinutes} min',
              ].join(' · '),
              style: AppTextStyles.caption.copyWith(color: AppColors.info),
            )
          else if (const ['PICKED_UP', 'OUT_FOR_DELIVERY', 'OTP_VERIFIED'].contains(order.status))
            Text('Out for delivery', style: AppTextStyles.caption.copyWith(color: AppColors.info))
          else if (order.status == 'CANCELLED')
            Text('Cancelled', style: AppTextStyles.caption.copyWith(color: AppColors.error)),
        ],
      ),
      ),
    );
  }
}
