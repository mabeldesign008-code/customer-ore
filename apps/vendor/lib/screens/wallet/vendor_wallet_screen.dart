import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:ore_core/ore_core.dart' hide AppColors;

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/router/app_router.dart';
import '../../data/ledger/vendor_ledger_repository.dart';
import '../../providers/vendor_data_provider.dart';
import '../../widgets/common/primary_button.dart';

class VendorWalletScreen extends ConsumerStatefulWidget {
  const VendorWalletScreen({super.key});

  @override
  ConsumerState<VendorWalletScreen> createState() => _VendorWalletScreenState();
}

class _VendorWalletScreenState extends ConsumerState<VendorWalletScreen> {
  DateTimeRange? _range;

  @override
  Widget build(BuildContext context) {
    final statement = _range == null
        ? ref.watch(vendorStatementProvider)
        : ref.watch(vendorStatementRangeProvider((from: _range!.start, to: DateTime(_range!.end.year, _range!.end.month, _range!.end.day, 23, 59, 59, 999))));
    return statement.when(
      loading: () => const Scaffold(body: Center(child: CircularProgressIndicator(semanticsLabel: 'Loading'))),
      error: (_, __) => Scaffold(
        appBar: AppBar(title: Text('StOre Wallet & Settlements', style: AppTextStyles.heading3)),
        body: Center(child: PrimaryButton(label: 'Retry', onPressed: () => ref.invalidate(vendorStatementProvider))),
      ),
      data: (value) {
        final balance = value.balance;
        return Scaffold(
          backgroundColor: AppColors.background,
          appBar: AppBar(
            backgroundColor: Colors.white,
            elevation: 0,
            title: Text('StOre Wallet & Settlements', style: AppTextStyles.heading3),
            actions: [
              IconButton(onPressed: _chooseDateRange, tooltip: 'Filter statement', icon: Icon(LucideIcons.calendar, color: _range == null ? AppColors.primary : AppColors.info)),
              IconButton(onPressed: () => _shareStatement(value), tooltip: 'Share statement', icon: const Icon(LucideIcons.share2, color: AppColors.primary)),
              IconButton(onPressed: () => _refreshStatement(), tooltip: 'Refresh', icon: const Icon(LucideIcons.refreshCw, color: AppColors.primary)),
            ],
          ),
          body: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Container(
                padding: const EdgeInsets.all(22),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [AppColors.primary, AppColors.primaryDark]),
                  borderRadius: BorderRadius.circular(22),
                ),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('Available for Settlement', style: AppTextStyles.bodySmall.copyWith(color: Colors.white70)),
                  const SizedBox(height: 8),
                  Text(Formatters.money(balance.availablePesewas / 100), style: AppTextStyles.heading1.copyWith(color: Colors.white, fontSize: 34)),
                  const SizedBox(height: 8),
                  Text('Pending: ${Formatters.money(balance.pendingSettlementPesewas / 100)}', style: AppTextStyles.bodySmall.copyWith(color: Colors.white70)),
                  const SizedBox(height: 18),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () => context.push(VendorRoutes.walletWithdraw),
                      icon: const Icon(LucideIcons.info, color: Colors.white, size: 16),
                      label: const Text('Settlement schedule', style: TextStyle(color: Colors.white)),
                      style: OutlinedButton.styleFrom(side: const BorderSide(color: Colors.white54)),
                    ),
                  ),
                ]),
              ),
              const SizedBox(height: 16),
              _breakdown('Accrued earnings', balance.accruedPesewas),
              _breakdown('Rolling reserve', -balance.reservePesewas, color: AppColors.warning),
              _breakdown('Owed/reversals', -balance.owedPesewas, color: AppColors.error),
              _breakdown('Lifetime paid out', balance.paidOutPesewas, color: AppColors.success),
              const SizedBox(height: 24),
              Text('Earning transactions', style: AppTextStyles.heading3),
              const SizedBox(height: 10),
              if (value.earnings.isEmpty)
                const Padding(padding: EdgeInsets.symmetric(vertical: 20), child: Text('No earning transactions in this period.'))
              else
                ...value.earnings.map((earning) => ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(LucideIcons.receiptText, color: AppColors.info),
                  title: Text(Formatters.money(earning.amountPesewas / 100), style: AppTextStyles.subtitleMedium),
                  subtitle: Text(earning.orderRef ?? earning.orderId, style: AppTextStyles.caption),
                  trailing: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.end, children: [
                    Text(earning.settledAt == null ? 'Pending' : 'Settled', style: AppTextStyles.caption.copyWith(color: earning.settledAt == null ? AppColors.warning : AppColors.success)),
                    Text(Formatters.formatDate(earning.createdAt), style: AppTextStyles.caption),
                  ]),
                )),
              const SizedBox(height: 24),
              Text('Settlement history', style: AppTextStyles.heading3),
              const SizedBox(height: 10),
              if (value.settlements.isEmpty)
                const Padding(padding: EdgeInsets.symmetric(vertical: 20), child: Text('No settlement records yet.'))
              else
                ...value.settlements.map((settlement) => ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(LucideIcons.wallet, color: AppColors.primary),
                  title: Text(Formatters.money(settlement.payoutPesewas / 100), style: AppTextStyles.subtitleMedium),
                  subtitle: Text(settlement.status, style: AppTextStyles.caption),
                  trailing: Text(Formatters.formatDate(settlement.createdAt), style: AppTextStyles.caption),
                )),
            ],
          ),
        );
      },
    );
  }

  Future<void> _chooseDateRange() async {
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
      initialDateRange: _range,
      helpText: 'Filter statement dates',
    );
    if (!mounted) return;
    setState(() => _range = picked);
  }

  void _refreshStatement() {
    if (_range == null) {
      ref.invalidate(vendorStatementProvider);
    } else {
      ref.invalidate(vendorStatementRangeProvider((
        from: _range!.start,
        to: DateTime(_range!.end.year, _range!.end.month, _range!.end.day, 23, 59, 59, 999),
      )));
    }
  }

  Future<void> _shareStatement(VendorLedgerStatement statement) async {
    final buffer = StringBuffer('Ore Vendor statement\\n');
    if (_range != null) buffer.writeln('Period: ${_range!.start.toIso8601String().split('T').first} to ${_range!.end.toIso8601String().split('T').first}');
    buffer.writeln('Order reference,Amount (GHS),Created,Settled');
    for (final earning in statement.earnings) {
      buffer.writeln('${earning.orderRef ?? earning.orderId},${(earning.amountPesewas / 100).toStringAsFixed(2)},${earning.createdAt.toIso8601String()},${earning.settledAt?.toIso8601String() ?? 'Pending'}');
    }
    buffer.writeln('Settlement ID,Payout (GHS),Status,Created');
    for (final settlement in statement.settlements) {
      buffer.writeln('${settlement.id},${(settlement.payoutPesewas / 100).toStringAsFixed(2)},${settlement.status},${settlement.createdAt.toIso8601String()}');
    }
    await SharePlus.instance.share(ShareParams(title: 'Ore Vendor statement', text: buffer.toString()));
  }

  Widget _breakdown(String label, int pesewas, {Color color = AppColors.textPrimary}) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppColors.border)),
      child: Row(children: [
        Expanded(child: Text(label, style: AppTextStyles.bodyMedium)),
        Text(Formatters.money(pesewas / 100), style: AppTextStyles.subtitleMedium.copyWith(color: color)),
      ]),
    );
  }
}
