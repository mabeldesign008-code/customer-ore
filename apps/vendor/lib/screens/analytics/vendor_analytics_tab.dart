import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:ore_core/ore_core.dart' hide AppColors;

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../providers/vendor_data_provider.dart';

class VendorAnalyticsTab extends ConsumerStatefulWidget {
  const VendorAnalyticsTab({super.key});

  @override
  ConsumerState<VendorAnalyticsTab> createState() => _VendorAnalyticsTabState();
}

class _VendorAnalyticsTabState extends ConsumerState<VendorAnalyticsTab> {
  String _period = 'week';

  @override
  Widget build(BuildContext context) {
    final analytics = ref.watch(vendorAnalyticsProvider(_period));
    final statement = ref.watch(vendorStatementProvider);
    return analytics.when(
      loading: () => const Scaffold(body: Center(child: CircularProgressIndicator(semanticsLabel: 'Loading'))),
      error: (_, __) => Scaffold(
        appBar: AppBar(title: Text('Analytics', style: AppTypography.h2())),
        body: Center(child: OreButton(label: 'Retry', onPressed: () => ref.invalidate(vendorAnalyticsProvider('week')))),
      ),
      data: (value) {
        final orders = _map(value['orders']);
        final revenue = _map(value['revenue']);
        final performance = _map(value['performance']);
        final totalPesewas = (revenue['totalPesewas'] as num?)?.toInt() ?? 0;
        final totalOrders = (orders['total'] as num?)?.toInt() ?? 0;
        final avgValue = (orders['avgValuePesewas'] as num?)?.toInt() ?? 0;
        final spots = _dailySpots(revenue['byDay']);
        return Scaffold(
          appBar: AppBar(
            title: Text('Analytics', style: AppTypography.h2()),
            actions: [
              DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: _period,
                  items: const [
                    DropdownMenuItem(value: 'day', child: Text('Day')),
                    DropdownMenuItem(value: 'week', child: Text('Week')),
                    DropdownMenuItem(value: 'month', child: Text('Month')),
                  ],
                  onChanged: (value) => setState(() => _period = value ?? 'week'),
                ),
              ),
              IconButton(tooltip: 'Action', onPressed: () => ref.invalidate(vendorAnalyticsProvider(_period)), icon: const Icon(LucideIcons.refreshCw)),
            ],
          ),
          body: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Row(children: [
                _metric('Revenue', Formatters.money(totalPesewas / 100), AppColors.success),
                const SizedBox(width: 12),
                _metric('Orders', '$totalOrders', AppColors.info),
              ]),
              const SizedBox(height: 12),
              Row(children: [
                _metric('Average order', Formatters.money(avgValue / 100), AppColors.primary),
                const SizedBox(width: 12),
                _metric('Acceptance', '${performance['acceptanceRate'] ?? 0}%', AppColors.warning),
              ]),
              const SizedBox(height: 20),
              Text('Revenue, ${_period == 'day' ? 'last 24 hours' : _period == 'month' ? 'last 30 days' : 'last 7 days'}', style: AppTextStyles.heading3),
              const SizedBox(height: 12),
              Container(
                height: 220,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.border)),
                child: LineChart(LineChartData(
                  gridData: const FlGridData(show: false),
                  titlesData: const FlTitlesData(show: false),
                  borderData: FlBorderData(show: false),
                  minY: 0,
                  lineBarsData: [LineChartBarData(spots: spots, isCurved: true, color: AppColors.primary, barWidth: 3, dotData: const FlDotData(show: false), belowBarData: BarAreaData(show: true, color: AppColors.primary.withOpacity(0.1)))],
                )),
              ),
              const SizedBox(height: 20),
              Text('Settlement history', style: AppTextStyles.heading3),
              const SizedBox(height: 10),
              statement.when(
                loading: () => const LinearProgressIndicator(),
                error: (_, __) => const Text('Settlement history unavailable'),
                data: (ledger) => ledger.settlements.isEmpty
                    ? const Text('No settlement records yet.')
                    : Column(children: ledger.settlements.map((settlement) => ListTile(
                        contentPadding: EdgeInsets.zero,
                        leading: const Icon(LucideIcons.wallet, color: AppColors.primary),
                        title: Text(Formatters.money(settlement.payoutPesewas / 100), style: AppTextStyles.subtitleMedium),
                        subtitle: Text(settlement.status, style: AppTextStyles.caption),
                        trailing: Text(Formatters.formatDate(settlement.createdAt), style: AppTextStyles.caption),
                      )).toList()),
              ),
            ],
          ),
        );
      },
    );
  }

  Map<String, dynamic> _map(Object? value) => value is Map ? Map<String, dynamic>.from(value) : <String, dynamic>{};

  List<FlSpot> _dailySpots(Object? value) {
    if (value is! List) return List<FlSpot>.generate(7, (index) => FlSpot(index.toDouble(), 0));
    final points = value.whereType<Map>().map((item) => Map<String, dynamic>.from(item)).toList();
    return List<FlSpot>.generate(7, (index) {
      final row = index < points.length ? points[index] : null;
      return FlSpot(index.toDouble(), ((row?['amountPesewas'] as num?)?.toDouble() ?? 0) / 100);
    });
  }

  Widget _metric(String label, String value, Color color) => Expanded(
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.border)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(label, style: AppTextStyles.caption),
            const SizedBox(height: 8),
            Text(value, style: AppTextStyles.heading3.copyWith(color: color)),
          ]),
        ),
      );
}
