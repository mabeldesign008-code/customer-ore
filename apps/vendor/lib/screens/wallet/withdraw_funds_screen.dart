import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../providers/vendor_data_provider.dart';

class WithdrawFundsScreen extends ConsumerStatefulWidget {
  const WithdrawFundsScreen({super.key});

  @override
  ConsumerState<WithdrawFundsScreen> createState() => _WithdrawFundsScreenState();
}

class _WithdrawFundsScreenState extends ConsumerState<WithdrawFundsScreen> {
  final _amount = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    _amount.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final balance = ref.watch(vendorBalanceProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Request early payout')),
      body: balance.when(
        loading: () => const Center(child: CircularProgressIndicator(semanticsLabel: 'Loading')),
        error: (_, __) => const Center(child: Text('Unable to load Vendor balance')),
        data: (value) => ListView(padding: const EdgeInsets.all(16), children: [
          Container(padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.08), borderRadius: BorderRadius.circular(16)), child: Row(children: [const Icon(LucideIcons.wallet, color: AppColors.primary), const SizedBox(width: 10), Expanded(child: Text('Available: ${value.availablePesewas ~/ 100}.${(value.availablePesewas % 100).toString().padLeft(2, '0')} GHS', style: AppTextStyles.heading3))])),
          const SizedBox(height: 20),
          Text('Amount (GHS)', style: AppTextStyles.label),
          const SizedBox(height: 6),
          TextField(controller: _amount, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(prefixText: 'GHS ', border: OutlineInputBorder())),
          const SizedBox(height: 10),
          Text('Minimum payout is GHS 100. The verified payout account from onboarding will be used.', style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary)),
          const SizedBox(height: 20),
          SizedBox(height: 50, child: ElevatedButton.icon(onPressed: _saving ? null : () => _request(value.availablePesewas), icon: const Icon(LucideIcons.send), label: Text(_saving ? 'Requesting…' : 'Request payout'))),
        ]),
      ),
    );
  }

  Future<void> _request(int availablePesewas) async {
    final amountGhs = double.tryParse(_amount.text.trim());
    final amountPesewas = amountGhs == null ? 0 : (amountGhs * 100).round();
    if (amountPesewas < 10000 || amountPesewas > availablePesewas) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Enter an amount from GHS 100 up to the available balance')));
      return;
    }
    setState(() => _saving = true);
    try {
      final withdrawal = await ref.read(vendorLedgerRepositoryProvider).requestWithdrawal(amountPesewas);
      ref.invalidate(vendorBalanceProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Payout request ${withdrawal.status.toLowerCase()}')));
      Navigator.pop(context);
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Unable to request payout. Verify the payout account and available balance.')));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }
}
