import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ore_core/ore_core.dart';

import '../providers/customer_auth_provider.dart';
import '../data/ledger/customer_dispute_repository.dart';

class DisputesScreen extends ConsumerWidget {
  const DisputesScreen({super.key});

  Future<void> _refresh(WidgetRef ref) async {
    ref.invalidate(customerDisputesProvider);
    await ref.read(customerDisputesProvider.future);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(customerDisputesProvider);
    final disputes = state.value ?? const <CustomerDispute>[];

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () => _refresh(ref),
          color: AppColors.primary,
          child: state.isLoading && disputes.isEmpty
              ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
              : state.hasError && disputes.isEmpty
                  ? ListView(
                      physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                      children: [
                        const SizedBox(height: 120),
                        OreEmptyState(
                          icon: Icons.cloud_off_rounded,
                          title: 'Disputes could not load',
                          subtitle: state.error.toString(),
                          ctaLabel: 'Retry',
                          onCta: () => _refresh(ref),
                        ),
                      ],
                    )
                  : ListView(
                      physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                      padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
                      children: [
                        Row(
                          children: [
                            IconButton(tooltip: 'Action', onPressed: () => context.pop(), icon: const Icon(Icons.arrow_back_ios_new_rounded)),
                            Expanded(child: Text('Refund requests', style: AppTypography.h3())),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Text('Delivered-order disputes are reviewed by Ore support. Any refund is decided by the Ledger service.', style: AppTypography.bodySm()),
                        const SizedBox(height: 18),
                        if (disputes.isEmpty)
                          const OreEmptyState(
                            icon: Icons.fact_check_outlined,
                            title: 'No refund requests',
                            subtitle: 'If an order has a problem, open a request from its order details.',
                          )
                        else
                          ...disputes.map((dispute) => _disputeCard(dispute)),
                      ],
                    ),
        ),
      ),
    );
  }

  Widget _disputeCard(CustomerDispute dispute) {
    final color = _statusColor(dispute.status);
    return OreCard(
      margin: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text('Order ${dispute.orderId}', style: AppTypography.bodyLg().copyWith(fontWeight: FontWeight.w800))),
              Text(dispute.status, style: AppTypography.caption(color)),
            ],
          ),
          const SizedBox(height: 6),
          Text(dispute.reason, style: AppTypography.bodySm()),
          const SizedBox(height: 4),
          Text(dispute.description, style: AppTypography.bodySm(AppColors.textSecondary)),
          if (dispute.refundedPesewas > 0) ...[
            const SizedBox(height: 10),
            Text('Refunded: ${Formatters.money(dispute.refundedPesewas / 100)}${dispute.refundMethod == null ? '' : ' · ${dispute.refundMethod}'}', style: AppTypography.bodySm(AppColors.success)),
          ],
          if (dispute.note != null && dispute.note!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text('Ore note: ${dispute.note}', style: AppTypography.caption()),
          ],
        ],
      ),
    );
  }

  Color _statusColor(String status) {
    final value = status.toUpperCase();
    if (value.contains('REFUND')) return AppColors.success;
    if (value == 'OPEN' || value == 'INVESTIGATING') return AppColors.warning;
    return AppColors.textSecondary;
  }
}
