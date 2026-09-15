import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:ore_core/ore_core.dart';

import '../../core/router/app_router.dart';
import '../../data/auth/rider_api_client_provider.dart';
import '../../data/ledger/rider_ledger_repository.dart';

class RiderEarningsScreen extends ConsumerWidget {
  const RiderEarningsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statement = ref.watch(riderEarningsStatementProvider);
    return statement.when(
      loading: () => const Scaffold(
        body: Center(child: CircularProgressIndicator(semanticsLabel: 'Loading')),
      ),
      error: (error, _) => Scaffold(
        appBar: AppBar(title: Text('Earnings', style: AppTypography.h2())),
        body: Center(
          child: OreButton(
            label: 'Retry',
            onPressed: () => ref.invalidate(riderEarningsStatementProvider),
          ),
        ),
      ),
      data: (e) => _buildEarnings(context, ref, e),
    );
  }

  Widget _buildEarnings(
    BuildContext context,
    WidgetRef ref,
    RiderEarningsStatement e,
  ) {
    final maxV = e.weekSeries.isEmpty
        ? 1.0
        : e.weekSeries.map((p) => p.amountPesewas / 100).reduce((a, b) => a > b ? a : b);

    return Scaffold(
      appBar: AppBar(
        title: Text('Earnings', style: AppTypography.h2()),
        actions: [
          IconButton(
            onPressed: () => ref.invalidate(riderEarningsStatementProvider),
            tooltip: 'Refresh earnings',
            icon: const Icon(LucideIcons.refreshCw),
          ),
        ],
      ),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        // Hero earnings card
        Container(
          padding: const EdgeInsets.all(20),
          decoration: const BoxDecoration(
            gradient: LinearGradient(colors: [AppColors.primary, AppColors.primaryDark]),
            borderRadius: BorderRadius.all(Radius.circular(22)),
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('This week', style: AppTypography.bodySm(Colors.white70)),
            const SizedBox(height: 6),
            Text(Formatters.money(e.weekEarnedPesewas / 100), style: AppTypography.h1(Colors.white).copyWith(fontSize: 36)),
            const SizedBox(height: 16),
            Row(children: [
              _mini('Today', Formatters.money(e.todayEarnedPesewas / 100)),
              Container(width: 1, height: 34, color: Colors.white24, margin: const EdgeInsets.symmetric(horizontal: 14)),
              _mini('Trips', '${e.tripsToday}'),
              Container(width: 1, height: 34, color: Colors.white24, margin: const EdgeInsets.symmetric(horizontal: 14)),
              _mini('Wallet', Formatters.money(e.wallet.withdrawablePesewas / 100)),
            ]),
          ]),
        ).animate().fadeIn().scale(),
        const SizedBox(height: 20),
        Text('Weekly trend', style: AppTypography.h3()),
        const SizedBox(height: 12),
        Container(
          height: 180,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 10)]),
          child: LineChart(LineChartData(
            gridData: const FlGridData(show: false),
            titlesData: FlTitlesData(
              leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
              rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
              topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
              bottomTitles: AxisTitles(sideTitles: SideTitles(
                showTitles: true,
                getTitlesWidget: (v, _) => Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(e.weekSeries[v.toInt()].label, style: AppTypography.caption()),
                ),
                reservedSize: 22,
              )),
            ),
            borderData: FlBorderData(show: false),
            lineBarsData: [
              LineChartBarData(
                spots: [for (int i = 0; i < e.weekSeries.length; i++) FlSpot(i.toDouble(), e.weekSeries[i].amountPesewas / 100)],
                isCurved: true,
                color: AppColors.primary,
                barWidth: 3,
                dotData: FlDotData(
                  show: true,
                  getDotPainter: (p0, p1, p2, p3) => FlDotCirclePainter(radius: 4, color: AppColors.primary, strokeWidth: 2, strokeColor: Colors.white),
                ),
                belowBarData: BarAreaData(show: true, color: AppColors.primary.withOpacity(0.1)),
              ),
            ],
            minY: 0,
            maxY: maxV * 1.2,
          )),
        ).animate().fadeIn(delay: 100.ms).slideY(begin: 0.1),
        const SizedBox(height: 20),
        Row(children: [
          _action(LucideIcons.wallet, 'Wallet', () => context.push(RiderRoutes.wallet), color: AppColors.success),
          const SizedBox(width: 10),
          _action(LucideIcons.clock, 'History', () => context.push(RiderRoutes.trips), color: AppColors.info),
        ]),
        const SizedBox(height: 20),
        Text('Daily breakdown', style: AppTypography.h3()),
        const SizedBox(height: 10),
        ...e.weekSeries.reversed.map((d) => Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14)),
          child: Row(children: [
            Container(width: 40, height: 40, decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.1), borderRadius: BorderRadius.circular(10)), child: Center(child: Text(d.label[0], style: AppTypography.h3(AppColors.primary)))),
            const SizedBox(width: 12),
            Expanded(child: Text(d.label, style: AppTypography.body().copyWith(fontWeight: FontWeight.w700))),
            Text(Formatters.money(d.amountPesewas / 100), style: AppTypography.bodyLg(AppColors.success).copyWith(fontWeight: FontWeight.w800)),
          ]),
        )),
        if (e.earnings.isNotEmpty) ...[
          const SizedBox(height: 20),
          Text('Trip earnings', style: AppTypography.h3()),
          const SizedBox(height: 10),
          ...e.earnings.take(20).map((row) => ListTile(
                contentPadding: EdgeInsets.zero,
                leading: CircleAvatar(
                  backgroundColor: AppColors.success.withOpacity(0.1),
                  child: const Icon(LucideIcons.banknote, color: AppColors.success, size: 18),
                ),
                title: Text(row.orderRef ?? row.orderId, style: AppTypography.body().copyWith(fontWeight: FontWeight.w700)),
                subtitle: Text(
                  _earningSubtitle(row),
                  style: AppTypography.caption(),
                ),
                trailing: Text(Formatters.money(row.amountPesewas / 100), style: AppTypography.bodyLg(AppColors.success).copyWith(fontWeight: FontWeight.w800)),
              )),
        ],
        const SizedBox(height: 30),
      ]),
    );
  }

  String _earningSubtitle(RiderEarningRow row) {
    if (row.tipPesewas <= 0 && row.peakPayPesewas <= 0) {
      return Formatters.timeAgo(row.createdAt);
    }
    final parts = <String>[
      'fare ${Formatters.money((row.basePesewas ?? row.amountPesewas) / 100)}',
      if (row.tipPesewas > 0) 'tip ${Formatters.money(row.tipPesewas / 100)}',
      if (row.peakPayPesewas > 0) 'peak ${Formatters.money(row.peakPayPesewas / 100)}',
    ];
    return '${Formatters.timeAgo(row.createdAt)} · ${parts.join(' + ')}';
  }

  Widget _mini(String label, String val) => Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    Text(label, style: AppTypography.caption(Colors.white70)),
    Text(val, style: AppTypography.h3(Colors.white).copyWith(fontWeight: FontWeight.w800)),
  ]));

  Widget _action(IconData i, String l, VoidCallback onTap, {Color? color}) => Expanded(
    child: AnimatedPress(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 8)]),
        child: Row(children: [
          Icon(i, color: color ?? AppColors.primary),
          const SizedBox(width: 10),
          Text(l, style: AppTypography.body().copyWith(fontWeight: FontWeight.w700)),
        ]),
      ),
    ),
  );
}
