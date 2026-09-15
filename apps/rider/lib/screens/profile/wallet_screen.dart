import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:ore_core/ore_core.dart';
import '../../data/auth/rider_api_client_provider.dart';
import '../../data/ledger/rider_ledger_repository.dart';

/// Rider Wallet with 4-Balance Breakdown & Doc §5 COD Cash Control Ladder.
class RiderWalletScreen extends ConsumerStatefulWidget {
  const RiderWalletScreen({super.key});

  @override
  ConsumerState<RiderWalletScreen> createState() => _RiderWalletScreenState();
}

class _RiderWalletScreenState extends ConsumerState<RiderWalletScreen> {
  bool _remitting = false;
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    _refreshTimer = Timer.periodic(const Duration(seconds: 15), (_) {
      ref.invalidate(riderWalletProvider);
      ref.invalidate(riderWithdrawalsProvider);
    });
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _remitCodCash(RiderWalletSnapshot wallet) async {
    if (wallet.cashLiabilityPesewas <= 0) return;
    HapticFeedback.mediumImpact();
    setState(() => _remitting = true);
    try {
      await ref.read(riderLedgerRepositoryProvider).remitCod(wallet.cashLiabilityPesewas);
      if (!mounted) return;
      ref.invalidate(riderWalletProvider);
      OreToast.show(
        context,
        message: 'COD cash remittance submitted successfully',
        type: ToastType.success,
      );
    } on DioException catch (error) {
      if (!mounted) return;
      OreToast.show(
        context,
        message: error.response?.data is Map
            ? ((error.response!.data as Map)['error']?['message']?.toString() ?? 'Unable to remit COD cash')
            : 'Unable to remit COD cash',
        type: ToastType.error,
      );
    } catch (_) {
      if (!mounted) return;
      OreToast.show(context, message: 'Unable to remit COD cash', type: ToastType.error);
    } finally {
      if (mounted) setState(() => _remitting = false);
    }
  }

  Future<void> _requestWithdrawal(RiderWalletSnapshot wallet) async {
    final amountController = TextEditingController();
    final destinationController = TextEditingController();
    final submit = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Withdraw to MoMo'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: amountController,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: const InputDecoration(labelText: 'Amount (GHS)'),
            ),
            TextField(
              controller: destinationController,
              decoration: const InputDecoration(
                labelText: 'Destination',
                hintText: '233241234567 MOMO MTN',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('Request'),
          ),
        ],
      ),
    );
    final amountGhs = double.tryParse(amountController.text.trim());
    final destination = destinationController.text.trim();
    amountController.dispose();
    destinationController.dispose();
    if (submit != true || amountGhs == null || destination.isEmpty) {
      if (submit == true && mounted) {
        OreToast.show(context, message: 'Enter a valid amount and destination', type: ToastType.error);
      }
      return;
    }

    final amountPesewas = (amountGhs * 100).round();
    try {
      final result = await ref.read(riderLedgerRepositoryProvider).requestWithdrawal(
            amountPesewas: amountPesewas,
            destination: destination,
          );
      if (!mounted) return;
      ref.invalidate(riderWalletProvider);
      ref.invalidate(riderWithdrawalsProvider);
      OreToast.show(
        context,
        message: 'Withdrawal ${result.status.toLowerCase()} submitted',
        type: ToastType.success,
      );
    } on DioException catch (error) {
      if (!mounted) return;
      final body = error.response?.data;
      final message = body is Map && body['error'] is Map
          ? (body['error'] as Map)['message']?.toString()
          : null;
      OreToast.show(context, message: message ?? 'Unable to request withdrawal', type: ToastType.error);
    } catch (_) {
      if (mounted) OreToast.show(context, message: 'Unable to request withdrawal', type: ToastType.error);
    }
  }

  @override
  Widget build(BuildContext context) {
    final wallet = ref.watch(riderWalletProvider);
    return wallet.when(
      loading: () => const Scaffold(body: Center(child: CircularProgressIndicator(semanticsLabel: 'Loading'))),
      error: (_, __) => Scaffold(
        appBar: AppBar(title: Text('Rider Wallet', style: AppTypography.h2())),
        body: Center(
          child: OreButton(
            label: 'Retry',
            onPressed: () => ref.invalidate(riderWalletProvider),
          ),
        ),
      ),
      data: (snapshot) => _buildWallet(context, ref, snapshot),
    );
  }

  Widget _buildWallet(BuildContext context, WidgetRef ref, RiderWalletSnapshot wallet) {
    final withdrawals = ref.watch(riderWithdrawalsProvider);
    final codRatio = wallet.tierLimitPesewas == 0
        ? 0.0
        : (wallet.cashLiabilityPesewas / wallet.tierLimitPesewas).clamp(0.0, 1.0);
    final isBlocked = !wallet.codEligible || codRatio >= wallet.triggerPct / 100;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: Text('Rider Wallet', style: AppTypography.h2()),
        actions: [
          IconButton(tooltip: 'Action', 
            icon: const Icon(LucideIcons.headset, color: AppColors.primary),
            onPressed: () => OreSupportModal.show(context, title: 'Wallet & Settlement Support'),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Main Balance Card
          Container(
            padding: const EdgeInsets.all(24),
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [AppColors.primary, AppColors.primaryDark],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.all(Radius.circular(24)),
              boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 12, offset: Offset(0, 6))],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Withdrawable Balance', style: AppTypography.bodySm(Colors.white70)),
                const SizedBox(height: 6),
                Text(Formatters.money(wallet.withdrawablePesewas / 100), style: AppTypography.h1(Colors.white).copyWith(fontSize: 36)),
                const SizedBox(height: 20),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () {
                          HapticFeedback.lightImpact();
                          _requestWithdrawal(wallet);
                        },
                        icon: const Icon(LucideIcons.arrowDownToLine, size: 18, color: Colors.white),
                        label: const Text('Withdraw to MoMo', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Colors.white54),
                          minimumSize: const Size(double.infinity, 48),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // 4-Balance Quick Tiles
          Row(
            children: [
              _miniTile('Pending Settlement', Formatters.money(wallet.pendingPesewas / 100), LucideIcons.clock),
              const SizedBox(width: 12),
              _miniTile(
                'Locked Balance',
                Formatters.money(wallet.lockedPesewas / 100),
                LucideIcons.shield,
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Doc §5 COD Cash Control Ladder Card
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: isBlocked ? AppColors.danger : AppColors.border, width: isBlocked ? 1.5 : 1),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Icon(LucideIcons.banknote, color: isBlocked ? AppColors.danger : AppColors.primary, size: 20),
                        const SizedBox(width: 8),
                        Text('COD Cash Control (Doc §5)', style: AppTypography.h3().copyWith(fontSize: 15)),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: (isBlocked ? AppColors.danger : AppColors.success).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        isBlocked ? 'AUTO-BLOCKED (90%)' : 'CLEAR',
                        style: AppTypography.caption(isBlocked ? AppColors.danger : AppColors.success).copyWith(fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Cash in Hand: ${Formatters.money(wallet.cashLiabilityPesewas / 100)}', style: AppTypography.bodyLg().copyWith(fontWeight: FontWeight.bold)),
                    Text('Tier Limit: ${Formatters.money(wallet.tierLimitPesewas / 100)}', style: AppTypography.caption(AppColors.textSecondary)),
                  ],
                ),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: LinearProgressIndicator(
                    value: codRatio,
                    minHeight: 8,
                    backgroundColor: AppColors.border,
                    valueColor: AlwaysStoppedAnimation<Color>(isBlocked ? AppColors.danger : AppColors.primary),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  isBlocked
                      ? '⚠️ You have reached 90% of your COD limit. Remit cash to unlock new orders.'
                      : 'Riders must remit collected cash before reaching 90% of tier limit.',
                  style: AppTypography.caption(isBlocked ? AppColors.danger : AppColors.textSecondary),
                ),
                if (wallet.cashLiabilityPesewas > 0) ...[
                  const SizedBox(height: 14),
                  OreButton(
                    label: _remitting ? 'Remitting via MoMo...' : 'Remit ${Formatters.money(wallet.cashLiabilityPesewas / 100)} via MoMo',
                    isLoading: _remitting,
                    onPressed: () => _remitCodCash(wallet),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 24),

          Text('Withdrawal history', style: AppTypography.h3()),
          const SizedBox(height: 12),
          withdrawals.when(
            loading: () => const Center(child: CircularProgressIndicator(semanticsLabel: 'Loading')),
            error: (_, __) => Text(
              'Unable to load withdrawal history.',
              style: AppTypography.caption(AppColors.textSecondary),
            ),
            data: (rows) => rows.isEmpty
                ? Text(
                    'No withdrawals yet.',
                    style: AppTypography.caption(AppColors.textSecondary),
                  )
                : Column(
                    children: rows.take(10).map((row) => Container(
                          margin: const EdgeInsets.only(bottom: 10),
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: AppColors.border),
                          ),
                          child: Row(
                            children: [
                              const Icon(LucideIcons.arrowUpRight, color: AppColors.danger),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('Withdrawal ${row.status}', style: AppTypography.button(AppColors.textPrimary)),
                                    Text(row.destination, style: AppTypography.caption(AppColors.textSecondary)),
                                  ],
                                ),
                              ),
                              Text(
                                Formatters.money(row.amountPesewas / 100),
                                style: AppTypography.bodyLg(AppColors.danger).copyWith(fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                        )).toList(),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _miniTile(String label, String value, IconData icon) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, size: 16, color: AppColors.primary),
                const SizedBox(width: 6),
                Text(label, style: AppTypography.caption(AppColors.textSecondary)),
              ],
            ),
            const SizedBox(height: 8),
            Text(value, style: AppTypography.h3()),
          ],
        ),
      ),
    );
  }
}
