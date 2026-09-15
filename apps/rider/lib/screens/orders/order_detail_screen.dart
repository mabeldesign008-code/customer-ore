import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:ore_core/ore_core.dart';

import '../../core/router/app_router.dart';
import '../../data/auth/rider_api_client_provider.dart';
import '../../providers/rider_provider.dart';

class RiderOrderDetailScreen extends ConsumerWidget {
  final String orderId;
  const RiderOrderDetailScreen({super.key, required this.orderId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final trips = ref.watch(tripsProvider);
    final trip = trips.currentTrip?.id == orderId
        ? trips.currentTrip
        : trips.history.where((t) => t.id == orderId).firstOrNull;

    if (trip == null) {
      return Scaffold(
        appBar: AppBar(),
        body: const Center(child: OreEmptyState(icon: LucideIcons.packageX, title: 'Order not found')),
      );
    }

    final active = trip.status.isActive;

    return Scaffold(
      appBar: AppBar(
        title: Text(trip.id, style: AppTypography.h3()),
        actions: [
          IconButton(tooltip: 'Action', 
            icon: const Icon(LucideIcons.map),
            onPressed: active ? () => context.push(RiderRoutes.delivery.replaceFirst(':id', trip.id)) : null,
          ),
        ],
      ),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        // Status header
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: LinearGradient(colors: [trip.service.color, trip.service.color.withOpacity(0.7)]),
            borderRadius: BorderRadius.circular(18),
          ),
          child: Row(children: [
            Icon(trip.service.icon, color: Colors.white, size: 28),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(trip.service.label + ' delivery', style: AppTypography.bodyLg(Colors.white).copyWith(fontWeight: FontWeight.w800)),
              Text(trip.status.riderLabel(), style: AppTypography.bodySm(Colors.white70)),
              if (trip.vendorReadiness != null || trip.pickupWindowMin != null)
                Text(
                  [
                    if (trip.vendorReadiness != null) 'Vendor ${trip.vendorReadiness}',
                    if (trip.pickupWindowMin != null) 'Pickup window ${trip.pickupWindowMin} min',
                  ].join(' · '),
                  style: AppTypography.caption(Colors.white70),
                ),
            ])),
            Text(Formatters.money(trip.payout), style: AppTypography.h3(Colors.white).copyWith(fontWeight: FontWeight.w800)),
          ]),
        ),
        if (trip.peakPayPesewas > 0) ...[
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(color: AppColors.warning.withOpacity(0.12), borderRadius: BorderRadius.circular(12)),
            child: Text('Peak +${Formatters.money(trip.peakPayPesewas / 100)}', style: AppTypography.body().copyWith(fontWeight: FontWeight.w800, color: AppColors.warning)),
          ),
        ],
        const SizedBox(height: 20),
        Text('Route', style: AppTypography.h3()),
        const SizedBox(height: 10),
        _StopCard(icon: LucideIcons.mapPin, title: 'Pickup', label: trip.pickupLabel, address: trip.pickupAddress, color: AppColors.primary),
        const _Connector(),
        _StopCard(icon: LucideIcons.flag, title: 'Drop-off', label: trip.dropoffLabel, address: trip.dropoffAddress, color: AppColors.success),
        if (trip.routeStops.length > 1) ...[
          const SizedBox(height: 16),
          Text('Route stops (${trip.routeStops.length})', style: AppTypography.h3()),
          const SizedBox(height: 8),
          ...trip.routeStops.map((stop) => ListTile(
                dense: true,
                contentPadding: EdgeInsets.zero,
                leading: CircleAvatar(
                  radius: 14,
                  backgroundColor: AppColors.primary.withOpacity(0.1),
                  child: Text('${stop.sequence}', style: AppTypography.caption(AppColors.primary).copyWith(fontWeight: FontWeight.w800)),
                ),
                title: Text(stop.label, style: AppTypography.body().copyWith(fontWeight: FontWeight.w700)),
                subtitle: Text('${stop.kind} · ${stop.address ?? 'Address available on map'}', maxLines: 1, overflow: TextOverflow.ellipsis),
              )),
        ],
        if (trip.operationalFlags.isNotEmpty) ...[
          const SizedBox(height: 12),
          Wrap(spacing: 6, runSpacing: 6, children: trip.operationalFlags.map((flag) => Chip(label: Text(flag.replaceAll('_', ' ')), visualDensity: VisualDensity.compact)).toList()),
        ],
        if (trip.errand != null) ...[
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: AppColors.errand.withOpacity(0.08), borderRadius: BorderRadius.circular(14)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Errand task', style: AppTypography.caption(AppColors.errand).copyWith(fontWeight: FontWeight.w800)),
              const SizedBox(height: 4),
              Text(trip.errand!.task, style: AppTypography.body().copyWith(fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              Text('Budget ${Formatters.money(trip.errand!.budgetPesewas / 100)} · Remaining ${Formatters.money(trip.errand!.remainingBudgetPesewas / 100)}', style: AppTypography.bodySm()),
            ]),
          ),
        ],
        if (trip.parcel != null) ...[
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: AppColors.parcel.withOpacity(0.08), borderRadius: BorderRadius.circular(14)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Parcel', style: AppTypography.caption(AppColors.parcel).copyWith(fontWeight: FontWeight.w800)),
              const SizedBox(height: 4),
              Text('${trip.parcel!.category} · ${trip.parcel!.weightKg.toStringAsFixed(1)} kg', style: AppTypography.body().copyWith(fontWeight: FontWeight.w700)),
              const SizedBox(height: 4),
              Text(trip.parcel!.description, style: AppTypography.bodySm()),
              const SizedBox(height: 6),
              Text('${trip.parcel!.pickupMode.replaceAll('_', ' ')} · Proof: ${trip.parcel!.proofMode.replaceAll('_', ' ')}', style: AppTypography.caption()),
            ]),
          ),
        ],
        const SizedBox(height: 20),
        if (trip.leaveAtDoor || trip.dropNote != null || trip.scheduledFor != null) ...[
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: AppColors.info.withOpacity(0.1), borderRadius: BorderRadius.circular(14)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              if (trip.leaveAtDoor)
                Text('Leave at door', style: AppTypography.body().copyWith(fontWeight: FontWeight.w800)),
              if (trip.scheduledFor != null) ...[
                const SizedBox(height: 4),
                Text('Scheduled ${Formatters.formatDate(trip.scheduledFor!)}', style: AppTypography.bodySm()),
              ],
              if (trip.dropNote != null && trip.dropNote!.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(trip.dropNote!, style: AppTypography.body().copyWith(fontStyle: FontStyle.italic)),
              ],
            ]),
          ),
          const SizedBox(height: 12),
        ],
        if (trip.customerNote != null) ...[
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: AppColors.accent.withOpacity(0.1), borderRadius: BorderRadius.circular(14)),
            child: Row(children: [
              const Icon(LucideIcons.messageSquare, color: AppColors.warning, size: 20),
              const SizedBox(width: 10),
              Expanded(child: Text(trip.customerNote!, style: AppTypography.body().copyWith(fontStyle: FontStyle.italic))),
            ]),
          ),
          const SizedBox(height: 20),
        ],
        Text('Items', style: AppTypography.h3()),
        const SizedBox(height: 10),
        ...trip.itemsPreview.map((i) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 3),
              child: Text('• $i', style: AppTypography.body()),
            )),
        const SizedBox(height: 20),
        Text('Customer', style: AppTypography.h3()),
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 8)]),
          child: Row(children: [
            CircleAvatar(radius: 22, backgroundColor: AppColors.primary.withOpacity(0.1), child: Text(trip.customerName[0], style: AppTypography.h3(AppColors.primary))),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(trip.customerName, style: AppTypography.bodyLg().copyWith(fontWeight: FontWeight.w700)),
              Text('In-app call — regular line if weak', style: AppTypography.caption()),
            ])),
            IconButton.filledTonal(
              onPressed: () => OreVoiceCallPage.open(
                context,
                client: ref.read(riderApiClientProvider),
                orderId: trip.id,
                target: OreVoiceTarget.customer,
                peerLabel: trip.customerName.trim().isEmpty ? 'Customer' : trip.customerName,
                fallbackTel: trip.customerPhone,
              ),
              icon: const Icon(LucideIcons.phone),
            ),
            IconButton.filledTonal(
              onPressed: () => context.push(RiderRoutes.chat.replaceFirst(':id', trip.id)),
              icon: const Icon(LucideIcons.messageCircle),
            ),
          ]),
        ),
        if (trip.hasCod) ...[
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: AppColors.warning.withOpacity(0.1), borderRadius: BorderRadius.circular(14)),
            child: Row(children: [
              const Icon(LucideIcons.banknote, color: AppColors.warning),
              const SizedBox(width: 10),
              Expanded(child: Text('Collect ${Formatters.money(trip.codAmount ?? 0)} cash on delivery', style: AppTypography.body().copyWith(fontWeight: FontWeight.w600))),
            ]),
          ),
        ],
        const SizedBox(height: 100),
      ]),
      bottomNavigationBar: active
          ? Container(
              padding: EdgeInsets.only(left: 16, right: 16, top: 12, bottom: MediaQuery.of(context).padding.bottom + 12),
              decoration: BoxDecoration(color: Colors.white, boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 12, offset: const Offset(0, -4))]),
              child: OreButton(
                label: 'Start delivery',
                icon: LucideIcons.navigation,
                onPressed: () => context.push(RiderRoutes.delivery.replaceFirst(':id', trip.id)),
              ),
            )
          : null,
    );
  }

}

class _StopCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String label;
  final String address;
  final Color color;
  const _StopCard({required this.icon, required this.title, required this.label, required this.address, required this.color});
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 8)]),
      child: Row(children: [
        Container(width: 36, height: 36, decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(10)), child: Icon(icon, color: color, size: 18)),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: AppTypography.caption(color).copyWith(fontWeight: FontWeight.w700)),
          Text(label, style: AppTypography.body().copyWith(fontWeight: FontWeight.w700)),
          Text(address, style: AppTypography.bodySm()),
        ])),
      ]),
    );
  }
}

class _Connector extends StatelessWidget {
  const _Connector();
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(left: 31),
        child: Container(width: 2, height: 20, color: AppColors.border),
      );
}
