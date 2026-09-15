import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ore_core/ore_core.dart';

import '../providers/orders_provider.dart';

class OrderConfirmationScreen extends ConsumerStatefulWidget {
  const OrderConfirmationScreen({super.key, required this.orderId});

  final String orderId;

  @override
  ConsumerState<OrderConfirmationScreen> createState() =>
      _OrderConfirmationScreenState();
}

class _OrderConfirmationScreenState
    extends ConsumerState<OrderConfirmationScreen> {
  Timer? _pollTimer;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Haptics.success();
      _loadOrder();
      _pollTimer = Timer.periodic(const Duration(seconds: 8), (_) {
        final order = ref.read(orderByIdProvider(widget.orderId));
        if (order != null && !order.paymentPending) {
          _pollTimer?.cancel();
          return;
        }
        _loadOrder(silent: true);
      });
    });
  }

  Future<void> _loadOrder({bool silent = false}) async {
    if (!silent && mounted) setState(() => _loading = true);
    try {
      await ref.read(ordersProvider.notifier).refreshOrder(widget.orderId);
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = null;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = error.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final order = ref.watch(orderByIdProvider(widget.orderId));
    if (order == null) {
      return Scaffold(
        body: Center(
          child: _error == null
              ? Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const CircularProgressIndicator(color: AppColors.primary, strokeWidth: 3),
                    const SizedBox(height: 16),
                    Text('Loading order…', style: AppTypography.body(AppColors.textSecondary)),
                  ],
                )
              : Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.cloud_off_rounded, color: AppColors.danger, size: 48),
                    const SizedBox(height: 12),
                    Text('Order confirmation is not available yet', style: AppTypography.h3()),
                    const SizedBox(height: 8),
                    Text(_error!, textAlign: TextAlign.center, style: AppTypography.bodySm()),
                    const SizedBox(height: 16),
                    OutlinedButton(onPressed: _loadOrder, child: const Text('Try again')),
                  ],
                ),
        ),
      );
    }

    final awaitingPayment = order.paymentPending;
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              const Spacer(),
              SuccessAnimation(size: awaitingPayment ? 128 : 160),
              const SizedBox(height: 32),
              Text(
                awaitingPayment ? 'Order created' : 'Order placed! 🎉',
                style: AppTypography.h1(AppColors.textPrimary).copyWith(fontSize: 28),
              ).animate().fadeIn(duration: Motion.medium, delay: 200.ms).slideY(begin: 0.2, curve: Motion.spring),
              const SizedBox(height: 10),
              Text(
                awaitingPayment
                    ? 'Your payment is awaiting confirmation. We will update this screen when Ore receives the payment webhook.'
                    : '${order.vendorName} is ${order.serviceType == ServiceType.food ? 'preparing' : 'processing'} your order.',
                textAlign: TextAlign.center,
                style: AppTypography.body(AppColors.textSecondary),
              ).animate().fadeIn(duration: Motion.medium, delay: 300.ms),
              if (awaitingPayment) ...[
                const SizedBox(height: 12),
                TextButton.icon(
                  onPressed: () => _loadOrder(),
                  icon: _loading
                      ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.refresh_rounded, size: 16),
                  label: const Text('Refresh payment status'),
                ),
              ],
              const SizedBox(height: 24),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.background,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  children: [
                    _info('Order ID', order.id),
                    Container(width: 1, height: 40, color: AppColors.border),
                    _info('ETA', order.eta.isEmpty ? 'Pending' : order.eta),
                    Container(width: 1, height: 40, color: AppColors.border),
                    _info('Total', Formatters.money(order.total)),
                  ],
                ),
              ).animate().fadeIn(duration: Motion.medium, delay: 400.ms).slideY(begin: 0.2, curve: Motion.spring),
              const Spacer(),
              OreButton(
                label: awaitingPayment ? 'View order' : 'Track order',
                icon: awaitingPayment ? Icons.receipt_long_outlined : Icons.location_on_rounded,
                onPressed: () => context.go('/orders/${order.id}/tracking'),
              ).animate().fadeIn(duration: Motion.medium, delay: 500.ms).slideY(begin: 0.2),
              const SizedBox(height: 12),
              TextButton(
                onPressed: () => context.go('/'),
                child: Text('Back to home', style: AppTypography.body(AppColors.primary).copyWith(fontWeight: FontWeight.w700)),
              ).animate().fadeIn(delay: 600.ms),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _info(String label, String value) => Expanded(
        child: Column(
          children: [
            Text(label.toUpperCase(), style: AppTypography.caption()),
            const SizedBox(height: 4),
            Text(
              value,
              style: AppTypography.bodyLg().copyWith(fontWeight: FontWeight.w800),
              textAlign: TextAlign.center,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      );
}
