import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:ore_core/ore_core.dart';

import '../../data/dispatch/rider_dispatch_repository.dart';

class PerformanceCard extends StatelessWidget {
  const PerformanceCard({super.key, required this.performance});

  final RiderPerformance performance;

  @override
  Widget build(BuildContext context) {
    final acceptance = performance.acceptanceRate == null ? '—' : '${(performance.acceptanceRate! * 100).round()}%';
    final completion = performance.completionRate == null ? '—' : '${(performance.completionRate! * 100).round()}%';
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 10)]),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const Icon(LucideIcons.chartBar, color: AppColors.primary),
          const SizedBox(width: 8),
          Expanded(child: Text('Performance · last ${performance.periodDays} days', style: AppTypography.h3())),
        ]),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(child: _metric('Acceptance', acceptance)),
          Expanded(child: _metric('Completion', completion)),
          Expanded(child: _metric('Rating', performance.rating.toStringAsFixed(1))),
        ]),
        const SizedBox(height: 8),
        Text('${performance.completedAssignments} completed assignments · ${performance.releasedAssignments} released', style: AppTypography.caption()),
      ]),
    );
  }

  Widget _metric(String label, String value) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(value, style: AppTypography.bodyLg(AppColors.primary).copyWith(fontWeight: FontWeight.w800)),
        Text(label, style: AppTypography.caption()),
      ]);
}
