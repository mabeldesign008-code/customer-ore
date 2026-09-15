import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:skeletonizer/skeletonizer.dart';
import 'package:ore_core/ore_core.dart';

import '../core/ui/toast_x.dart';
import '../data/ledger/customer_credit_repository.dart';
import '../data/ledger/customer_loyalty_repository.dart';
import '../data/payment/customer_payment_launcher.dart';
import '../providers/customer_auth_provider.dart';
import '../providers/wallet_provider.dart';

class WalletScreen extends ConsumerStatefulWidget {
  const WalletScreen({super.key});
  @override
  ConsumerState<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends ConsumerState<WalletScreen> {
  static const List<int> _topUpPresetsPesewas = <int>[1000, 2000, 5000, 10000];
  static const int _minTopUpPesewas = 100;
  static const int _maxTopUpPesewas = 500000;

  bool _balanceHidden = false;
  bool _loading = true;
  bool _toppingUp = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      try {
        await ref.read(walletProvider.notifier).refresh();
      } finally {
        if (mounted) setState(() => _loading = false);
      }
    });
  }

  Future<void> _refresh() async {
    HapticFeedback.selectionClick();
    setState(() => _loading = true);
    ref.invalidate(customerCreditStatementProvider);
    ref.invalidate(customerLoyaltyProvider);
    try {
      await ref.read(walletProvider.notifier).refresh();
    } finally {
      if (mounted) setState(() => _loading = false);
    }
    HapticFeedback.lightImpact();
  }

  @override
  Widget build(BuildContext context) {
    final balance = ref.watch(walletProvider);
    final creditState = ref.watch(customerCreditStatementProvider);
    final credit = creditState.value;
    final loyaltyState = ref.watch(customerLoyaltyProvider);
    final loyalty = loyaltyState.value;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: RefreshIndicator(
        onRefresh: _refresh,
        color: Colors.white,
        backgroundColor: AppColors.primary,
        displacement: 24,
        edgeOffset: 0,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(
            parent: BouncingScrollPhysics(),
          ),
          slivers: [
            SliverAppBar(
              expandedHeight: 280,
              pinned: true,
              stretch: true,
              leading: IconButton(tooltip: 'Action', 
                icon: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.3), shape: BoxShape.circle),
                  child: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 18),
                ),
                onPressed: () => context.pop(),
              ),
              actions: [
                IconButton(tooltip: 'Action', 
                  icon: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.3), shape: BoxShape.circle),
                    child: Icon(_balanceHidden ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                        color: Colors.white, size: 18),
                  ),
                  onPressed: () {
                    HapticFeedback.selectionClick();
                    setState(() => _balanceHidden = !_balanceHidden);
                  },
                ),
              ],
              backgroundColor: AppColors.primary,
              flexibleSpace: FlexibleSpaceBar(
                stretchModes: const [StretchMode.zoomBackground],
                background: Stack(fit: StackFit.expand, children: [
                  Container(
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [
                          AppColors.primaryLight,
                          AppColors.primary,
                          AppColors.primaryDark,
                        ],
                      ),
                    ),
                  ),
                  Positioned(
                      top: -60,
                      right: -40,
                      child: Container(
                          width: 200,
                          height: 200,
                          decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: Colors.white.withOpacity(0.08)))).animate(onPlay: (c) => c.repeat(reverse: true)).scale(
                                begin: const Offset(1, 1), end: const Offset(1.1, 1.1), duration: 3.seconds),
                  Positioned(
                      bottom: -60,
                      left: -40,
                      child: Container(
                          width: 160,
                          height: 160,
                          decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: AppColors.accent.withOpacity(0.15)))),
                  SafeArea(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(20, 60, 20, 20),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        const SizedBox(height: 20),
                        Text('Available Balance',
                            style: AppTypography.body(const Color(0xB3FFFFFF))
                                .copyWith(fontSize: 16)),
                        const SizedBox(height: 8),
                        Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
                          Text(
                            _balanceHidden ? '₵ •••••' : '₵ ${balance.toStringAsFixed(2)}',
                            style: AppTypography.display(Colors.white)
                                .copyWith(fontSize: 44, letterSpacing: -1),
                          ),
                        ]).animate().fadeIn(duration: Motion.medium).slideY(
                              begin: 0.2,
                              curve: Motion.spring,
                            ),
                        const SizedBox(height: 18),
                        Row(children: [
                          _action(Icons.add_rounded, 'Top up', _openTopUpSheet),
                          const SizedBox(width: 12),
                          _action(Icons.north_east_rounded, 'Send', () {
                            context.showToast('Customer-to-customer wallet transfers are not available.', type: ToastType.info);
                          }),
                          const SizedBox(width: 12),
                          _action(Icons.south_west_rounded, 'Withdraw',
                              () => context.showToast('Customer wallet credit cannot be withdrawn.', type: ToastType.info)),
                        ]).animate().fadeIn(delay: 100.ms).slideY(begin: 0.2),
                      ]),
                    ),
                  ),
                ]),
              ),
            ),
            SliverToBoxAdapter(
              child: Skeletonizer(
                enabled: _loading,
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [
                      Expanded(
                          child: _statCard(Icons.trending_up_rounded, 'Credited',
                              credit == null ? '—' : Formatters.money(credit.lifetimeCreditedPesewas / 100), AppColors.success)),
                      const SizedBox(width: 12),
                      Expanded(
                          child: _statCard(Icons.south_east_rounded, 'Used',
                              credit == null ? '—' : Formatters.money(credit.lifetimeUsedPesewas / 100), AppColors.danger)),
                    ]).animate().fadeIn(delay: 200.ms).slideY(begin: 0.1),
                    const SizedBox(height: 16),
                    _loyaltyCard(loyaltyState, loyalty),
                    const SizedBox(height: 24),
                    Text('Credit Activity', style: AppTypography.h2()),
                    const SizedBox(height: 8),
                    ...(credit == null
                        ? [
                            Text(
                              creditState.hasError
                                  ? 'Credit statement is temporarily unavailable.'
                                  : 'Loading credit transactions…',
                              style: AppTypography.bodySm(AppColors.textSecondary),
                            ),
                          ]
                        : _creditTransactions(credit.logs)),
                    const SizedBox(height: 20),
                  ]),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _loyaltyCard(AsyncValue<CustomerLoyalty> loyaltyState, CustomerLoyalty? loyalty) {
    final redeemable = loyalty == null
        ? 0
        : (loyalty.points ~/ loyalty.redeemBlockPoints) * loyalty.redeemBlockPoints;
    return OreCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            const Icon(Icons.star_rounded, color: AppColors.accent),
            const SizedBox(width: 8),
            Text('Loyalty points', style: AppTypography.h3()),
          ]),
          const SizedBox(height: 8),
          if (loyaltyState.hasError)
            Text('Loyalty is temporarily unavailable.', style: AppTypography.bodySm())
          else if (loyalty == null)
            Text('Loading loyalty…', style: AppTypography.bodySm())
          else ...[
            Text('${loyalty.points} pts', style: AppTypography.h2(AppColors.primary)),
            const SizedBox(height: 4),
            Text(
              'Earned ${loyalty.lifetimeEarned} · Redeemed ${loyalty.lifetimeRedeemed}. ${loyalty.redeemBlockPoints} points = ${Formatters.money(loyalty.redeemBlockPesewas / 100)} wallet credit.',
              style: AppTypography.caption(),
            ),
            const SizedBox(height: 12),
            OreButton(
              label: redeemable < loyalty.redeemBlockPoints
                  ? 'Need ${loyalty.redeemBlockPoints} points to redeem'
                  : 'Redeem $redeemable pts for ${Formatters.money(redeemable * loyalty.redeemBlockPesewas / loyalty.redeemBlockPoints / 100)}',
              onPressed: redeemable < loyalty.redeemBlockPoints ? null : () => _redeemLoyalty(redeemable),
            ),
          ],
        ],
      ),
    );
  }

  Future<void> _redeemLoyalty(int points) async {
    try {
      await ref.read(customerLoyaltyRepositoryProvider).redeem(points);
      ref.invalidate(customerLoyaltyProvider);
      ref.invalidate(customerCreditStatementProvider);
      await ref.read(walletProvider.notifier).refresh();
      if (mounted) {
        context.showToast(
          'Redeemed $points points to Ore Wallet Credit.',
          type: ToastType.success,
        );
      }
    } catch (error) {
      if (mounted) context.showToast(_apiError(error), type: ToastType.error);
    }
  }

  String _kindLabel(String kind) {
    switch (kind) {
      case 'topup':
        return 'Top-up';
      case 'referral':
        return 'Referral credit';
      case 'dispute':
        return 'Refund';
      case 'errand':
        return 'Errand refund';
      case 'admin':
        return 'Ore credit';
      case 'manual':
        return 'Credit';
      default:
        return kind;
    }
  }

  String _apiError(Object error) {
    if (error is DioException) {
      final body = error.response?.data;
      if (body is Map && body['error'] is Map) {
        final message = (body['error'] as Map)['message']?.toString().trim();
        if (message != null && message.isNotEmpty) return message;
      }
    }
    final message = error.toString().replaceFirst('Exception: ', '').trim();
    return message.isEmpty ? 'Top-up could not be started.' : message;
  }

  Future<void> _openTopUpSheet() async {
    if (_toppingUp) return;
    HapticFeedback.selectionClick();
    int selectedPesewas = _topUpPresetsPesewas.first;
    final customController = TextEditingController();
    final amount = await showModalBottomSheet<int>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) {
        return Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(sheetContext).viewInsets.bottom),
          child: StatefulBuilder(
            builder: (context, setSheetState) {
              final customRaw = double.tryParse(customController.text.trim());
              final customPesewas = customRaw == null ? null : (customRaw * 100).round();
              final customSelected = customPesewas != null && !_topUpPresetsPesewas.contains(customPesewas);
              return Container(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
                decoration: const BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: AppColors.border,
                          borderRadius: BorderRadius.circular(99),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text('Top up Ore Wallet', style: AppTypography.h2()),
                    const SizedBox(height: 6),
                    Text(
                      'Pay with MoMo or card. Credit is added only after Paystack confirms the charge.',
                      style: AppTypography.bodySm(AppColors.textSecondary),
                    ),
                    const SizedBox(height: 16),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        for (final amountPesewas in _topUpPresetsPesewas)
                          ChoiceChip(
                            label: Text(Formatters.money(amountPesewas / 100)),
                            selected: selectedPesewas == amountPesewas,
                            onSelected: (_) {
                              customController.clear();
                              setSheetState(() => selectedPesewas = amountPesewas);
                            },
                          ),
                        ChoiceChip(
                          label: Text(
                            customSelected ? Formatters.money(customPesewas / 100) : 'Custom',
                          ),
                          selected: customSelected,
                          onSelected: (_) => setSheetState(() {
                            if (customPesewas != null) selectedPesewas = customPesewas;
                          }),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: customController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(
                        labelText: 'Custom amount (GHS)',
                        hintText: 'GHS 1.00 – 5,000.00',
                      ),
                      onChanged: (value) {
                        final parsed = double.tryParse(value.trim());
                        setSheetState(() {
                          if (parsed != null) selectedPesewas = (parsed * 100).round();
                        });
                      },
                    ),
                    const SizedBox(height: 16),
                    OreButton(
                      label: 'Continue to payment',
                      onPressed: () => Navigator.pop(sheetContext, selectedPesewas),
                    ),
                  ],
                ),
              );
            },
          ),
        );
      },
    );
    customController.dispose();
    if (amount == null || !mounted) return;
    if (amount < _minTopUpPesewas || amount > _maxTopUpPesewas) {
      context.showToast('Enter an amount between GHS 1.00 and GHS 5,000.00.', type: ToastType.error);
      return;
    }
    await _startTopUp(amount);
  }

  Future<void> _startTopUp(int amountPesewas) async {
    setState(() => _toppingUp = true);
    try {
      final result = await ref.read(customerCreditRepositoryProvider).initializeTopUp(amountPesewas: amountPesewas);
      final url = result.paystackUrl;
      final opened = await openCustomerPayment(url);
      if (!mounted) return;
      if (url != null && url.isNotEmpty && !opened) {
        context.showToast('Payment page could not be opened. Try again.', type: ToastType.error);
        return;
      }
      if (url == null || url.isEmpty) {
        context.showToast(
          'Payment started. Credit appears after the charge is confirmed — the app will not add it locally.',
          type: ToastType.info,
          duration: const Duration(seconds: 4),
        );
      } else {
        context.showToast('Complete payment to add ${Formatters.money(amountPesewas / 100)}.', type: ToastType.info);
      }
      await _waitForTopUp(result.reference);
    } catch (error) {
      if (mounted) context.showToast(_apiError(error), type: ToastType.error);
    } finally {
      if (mounted) setState(() => _toppingUp = false);
    }
  }

  Future<void> _waitForTopUp(String reference) async {
    final repo = ref.read(customerCreditRepositoryProvider);
    for (var attempt = 0; attempt < 30; attempt++) {
      await Future<void>.delayed(const Duration(seconds: 3));
      if (!mounted) return;
      try {
        final row = await repo.getTopUp(reference);
        if (row.status == 'SUCCESS') {
          ref.invalidate(customerCreditStatementProvider);
          await ref.read(walletProvider.notifier).refresh();
          if (!mounted) return;
          context.showToast(
            '${Formatters.money(row.amountPesewas / 100)} added to your wallet.',
            type: ToastType.success,
          );
          return;
        }
        if (row.status == 'FAILED') {
          context.showToast('Top-up payment failed. No credit was added.', type: ToastType.error);
          return;
        }
      } catch (_) {
        // Keep polling; pull-to-refresh remains the fallback.
      }
    }
    if (!mounted) return;
    context.showToast(
      'If you paid, credit appears after confirmation. Pull to refresh.',
      type: ToastType.info,
      duration: const Duration(seconds: 4),
    );
  }

  Widget _action(IconData i, String label, VoidCallback onTap) {
    return Expanded(
      child: AnimatedPress(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.15),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Colors.white.withOpacity(0.25)),
          ),
          child: Column(children: [
            Icon(i, color: Colors.white, size: 20),
            const SizedBox(height: 6),
            Text(label,
                style: AppTypography.caption(Colors.white)
                    .copyWith(fontSize: 11, fontWeight: FontWeight.w700)),
          ]),
        ),
      ),
    );
  }

  Widget _statCard(IconData i, String label, String value, Color c) {
    return OreCard(
      padding: const EdgeInsets.all(14),
      child: Row(children: [
        Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
                color: c.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12)),
            child: Icon(i, color: c, size: 18)),
        const SizedBox(width: 10),
        Expanded(
            child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
              Text(label, style: AppTypography.caption()),
              Text(value,
                  style: AppTypography.bodyLg()
                      .copyWith(fontWeight: FontWeight.w800)),
            ])),
      ]),
    );
  }

  List<Widget> _creditTransactions(List<CustomerCreditLog> logs) {
    if (logs.isEmpty) return [Text('No credit transactions yet.', style: AppTypography.bodySm())];
    return [
      for (var i = 0; i < logs.length && i < 20; i++)
        _tx(
          logs[i].amountPesewas >= 0 ? Icons.add_rounded : Icons.south_east_rounded,
          _kindLabel(logs[i].kind),
          logs[i].reason,
          logs[i].amountPesewas.abs() / 100,
          logs[i].amountPesewas >= 0,
          Formatters.formatDate(logs[i].createdAt),
        ).animate(delay: Duration(milliseconds: 50 * i)).fadeIn().slideY(begin: 0.12),
    ];
  }

  Widget _tx(IconData i, String title, String sub, double amt, bool credit, String time) {
    final c = credit ? AppColors.success : AppColors.textPrimary;
    return OreCard(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        child: Row(children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
                color: (credit ? AppColors.success : AppColors.primary).withOpacity(0.1),
                shape: BoxShape.circle),
            child: Icon(i, color: credit ? AppColors.success : AppColors.primary, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title,
                style:
                    AppTypography.bodyLg().copyWith(fontWeight: FontWeight.w700)),
            Text(sub, style: AppTypography.caption()),
          ])),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text('${credit ? '+' : '-'}₵${amt.toStringAsFixed(2)}',
                style: AppTypography.bodyLg(c).copyWith(fontWeight: FontWeight.w800)),
            Text(time, style: AppTypography.caption()),
          ]),
        ]),
    );
  }

}
