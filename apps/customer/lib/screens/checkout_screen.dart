import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../core/ui/iconly_compat.dart';
import 'package:ore_core/ore_core.dart';

import '../core/ui/toast_x.dart';
import '../providers/cart_provider.dart';
import '../providers/checkout_provider.dart';
import '../providers/customer_address_provider.dart';
import '../providers/wallet_provider.dart';

class CheckoutScreen extends ConsumerStatefulWidget {
  const CheckoutScreen({super.key});
  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  final _noteCtrl = TextEditingController();
  final _voucherCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final walletPesewas = ref.read(walletProvider.notifier).balancePesewas;
      ref.read(checkoutProvider.notifier).setWalletAvailable(walletPesewas);
    });
  }

  @override
  void dispose() {
    _noteCtrl.dispose();
    _voucherCtrl.dispose();
    super.dispose();
  }

  String _fmtSchedule(DateTime dt) {
    final hour = dt.hour.toString().padLeft(2, '0');
    final min = dt.minute.toString().padLeft(2, '0');
    final day = dt.day.toString().padLeft(2, '0');
    final mon = dt.month.toString().padLeft(2, '0');
    return '$day/$mon ${hour}:${min}';
  }

  Future<void> _placeOrder() async {
    HapticFeedback.mediumImpact();
    try {
      final orderId = await ref.read(checkoutProvider.notifier).placeOrder();
      if (!mounted) return;
      if (orderId.isEmpty) {
        context.showToast('Order was created but we could not read the ID. Pull orders to continue.', type: ToastType.warning);
        context.go('/orders');
        return;
      }
      HapticFeedback.heavyImpact();
      context.go('/order-confirm/$orderId');
    } catch (e) {
      if (!mounted) return;
      final msg = e.toString().replaceFirst('Exception: ', '');
      context.showToast(msg.isEmpty ? 'Checkout failed. Please try again.' : msg, type: ToastType.error);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cart = ref.watch(cartProvider);
    final checkout = ref.watch(checkoutProvider);
    final addressBook = ref.watch(customerAddressBookProvider);
    final selectedAddr = ref.watch(selectedAddressProvider).selected ?? addressBook.defaultAddress;
    final walletBalance = ref.watch(walletProvider);

    if (cart.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('Checkout')),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(IconlyLight.buy, size: 72, color: AppColors.textMuted),
              const SizedBox(height: 16),
              Text('Your cart is empty', style: AppTypography.h2()),
              const SizedBox(height: 8),
              OreButton(label: 'Browse vendors', onPressed: () => context.go('/')),
            ],
          ),
        ),
      );
    }

    final zoneBlocked = checkout.feeEstimate != null && !checkout.feeEstimate!.zoneOk;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('Checkout', style: AppTypography.h2()),
        leading: IconButton(icon: const Icon(IconlyLight.arrowLeft2), onPressed: () => context.pop()),
      ),
      body: Stack(
        children: [
          ListView(
            physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
            padding: const EdgeInsets.only(left: 20, right: 20, top: 8, bottom: 200),
            children: [
              // ── Delivery address ──────────────────────────────
              _sectionCard(
                title: 'Delivery Address',
                icon: IconlyBold.location,
                onEdit: () async {
                  await context.push('/addresses');
                  ref.read(checkoutProvider.notifier).onAddressChanged();
                },
                child: selectedAddr == null
                    ? Text('Add a delivery address', style: AppTypography.body(AppColors.primary))
                    : Row(children: [
                        Expanded(
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(selectedAddr.label, style: AppTypography.h3()),
                            const SizedBox(height: 4),
                            Text(selectedAddr.displayAddress, style: AppTypography.bodySm(AppColors.textSecondary)),
                          ]),
                        ),
                        const Icon(IconlyLight.arrowRight2, color: AppColors.primary),
                      ]),
              ).animate().fadeIn().slideX(begin: 0.1),
              const SizedBox(height: 16),

              if (zoneBlocked) ...[
                OreCard(
                  color: AppColors.danger.withOpacity(0.08),
                  child: Row(children: [
                    const Icon(Icons.location_off_rounded, color: AppColors.danger),
                    const SizedBox(width: 10),
                    const Expanded(child: Text("Ore doesn't deliver to this address yet.")),
                  ]),
                ),
                const SizedBox(height: 16),
              ],

              // ── Orders by vendor ──────────────────────────────
              for (final v in checkout.vendors) ...[
                _vendorBreakdown(v),
                const SizedBox(height: 12),
              ],

              const SizedBox(height: 8),

              // ── Delivery options ──────────────────────────────
              _sectionCard(
                title: 'Delivery options',
                icon: IconlyBold.document,
                child: Column(children: [
                  SwitchListTile.adaptive(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Leave at door'),
                    subtitle: const Text('Rider leaves the order at your doorstep', style: TextStyle(fontSize: 12)),
                    value: checkout.leaveAtDoor,
                    activeColor: AppColors.primary,
                    onChanged: (v) => ref.read(checkoutProvider.notifier).setLeaveAtDoor(v),
                  ),
                  const Divider(height: 8),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(IconlyBold.timeCircle, color: AppColors.primary),
                    title: Text(checkout.scheduledFor == null
                        ? 'Deliver now'
                        : 'Scheduled: ${_fmtSchedule(checkout.scheduledFor!)}'),
                    subtitle: Text(
                      checkout.scheduledFor == null
                          ? 'Tap to schedule for later'
                          : 'Tap to change or clear',
                      style: const TextStyle(fontSize: 12),
                    ),
                    trailing: checkout.scheduledFor != null
                        ? IconButton(
                            icon: const Icon(Icons.close_rounded, size: 18),
                            onPressed: () {
                              ref.read(checkoutProvider.notifier).setScheduledFor(null);
                              HapticFeedback.selectionClick();
                            },
                          )
                        : const Icon(Icons.chevron_right_rounded),
                    onTap: () async {
                      final now = DateTime.now();
                      final picked = await showDatePicker(
                        context: context,
                        initialDate: now.add(const Duration(minutes: 30)),
                        firstDate: now,
                        lastDate: now.add(const Duration(days: 7)),
                      );
                      if (picked == null || !mounted) return;
                      final time = await showTimePicker(
                        context: context,
                        initialTime: TimeOfDay.fromDateTime(now.add(const Duration(minutes: 30))),
                      );
                      if (time == null) return;
                      final dt = DateTime(picked.year, picked.month, picked.day, time.hour, time.minute);
                      if (dt.isBefore(now.add(const Duration(minutes: 20)))) {
                        if (!mounted) return;
                        context.showToast('Pick a time at least 20 minutes from now.', type: ToastType.warning);
                        return;
                      }
                      ref.read(checkoutProvider.notifier).setScheduledFor(dt);
                      HapticFeedback.selectionClick();
                    },
                  ),
                  const Divider(height: 8),
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: OreInput(
                      controller: _noteCtrl,
                      hintText: 'Delivery note (optional)',
                      prefixIcon: IconlyLight.chat,
                      maxLines: 2,
                      onChanged: ref.read(checkoutProvider.notifier).setDeliveryNote,
                    ),
                  ),
                ]),
              ),

              const SizedBox(height: 16),

              // ── Voucher ──────────────────────────────────────
              _sectionCard(
                title: 'Voucher',
                icon: IconlyBold.discount,
                child: Row(children: [
                  Expanded(
                    child: OreInput(
                      controller: _voucherCtrl,
                      hintText: 'Enter code',
                      prefixIcon: IconlyLight.ticketStar,
                      textCapitalization: TextCapitalization.characters,
                    ),
                  ),
                  const SizedBox(width: 8),
                  TextButton(
                    onPressed: () {
                      final code = _voucherCtrl.text.trim().toUpperCase();
                      ref.read(checkoutProvider.notifier).setVoucher(code.isEmpty ? null : code);
                      HapticFeedback.selectionClick();
                      context.showToast(code.isEmpty ? 'Voucher cleared' : 'Voucher applied', type: code.isEmpty ? ToastType.info : ToastType.success);
                    },
                    child: const Text('Apply'),
                  ),
                ]),
              ),

              const SizedBox(height: 16),

              // ── Wallet credit ────────────────────────────────
              if (walletBalance > 0)
                _sectionCard(
                  title: 'Ore Wallet',
                  icon: IconlyBold.wallet,
                  child: SwitchListTile.adaptive(
                    contentPadding: EdgeInsets.zero,
                    title: Text('Use ₵${walletBalance.toStringAsFixed(2)} wallet credit'),
                    value: checkout.useWalletCredit,
                    activeColor: AppColors.primary,
                    onChanged: (v) => ref.read(checkoutProvider.notifier).setUseWallet(v),
                  ),
                ),

              const SizedBox(height: 16),

              // ── Tip rider ────────────────────────────────────
              _sectionCard(
                title: 'Tip your rider',
                icon: IconlyBold.heart,
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('100% goes to your rider', style: AppTypography.caption(AppColors.textSecondary)),
                  const SizedBox(height: 10),
                  Wrap(spacing: 8, children: [
                    for (final gh in const [0, 2, 5, 10])
                      ChoiceChip(
                        label: Text(gh == 0 ? 'No tip' : '₵$gh'),
                        selected: checkout.tipPesewas == gh * 100,
                        onSelected: (_) {
                          HapticFeedback.selectionClick();
                          ref.read(checkoutProvider.notifier).setTipPesewas(gh * 100);
                        },
                      ),
                  ]),
                ]),
              ),

              const SizedBox(height: 20),
              if (checkout.error != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Text(checkout.error!, style: AppTypography.bodySm(AppColors.danger)),
                ),
            ],
          ),

          // ── Sticky footer ─────────────────────────────────
          Positioned(
            left: 20, right: 20, bottom: MediaQuery.of(context).padding.bottom + 20,
            child: AnimatedPress(
              onTap: (checkout.isReadyToPlace && !checkout.placing) ? _placeOrder : null,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [AppColors.primary, Color(0xFF0284C7)]),
                  borderRadius: BorderRadius.circular(32),
                  boxShadow: [BoxShadow(color: AppColors.primary.withOpacity(0.4), blurRadius: 24, offset: const Offset(0, 10))],
                ),
                child: Row(children: [
                  Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
                    Text(checkout.estimating ? 'Estimating…' : 'Total', style: AppTypography.bodySm(Colors.white.withOpacity(0.85))),
                    Text(Formatters.money(checkout.grandTotal), style: AppTypography.h2(Colors.white)),
                  ]),
                  const Spacer(),
                  if (checkout.placing || checkout.estimating)
                    const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                  else
                    Row(children: [
                      Text('Place Order', style: AppTypography.button().copyWith(fontSize: 17, color: Colors.white)),
                      const SizedBox(width: 6),
                      const Icon(IconlyBold.arrowRight2, color: Colors.white),
                    ]),
                ]),
              ),
            ).animate().fadeIn(delay: 200.ms).slideY(begin: 0.3, curve: Curves.easeOutBack),
          ),
        ],
      ),
    );
  }

  Widget _sectionCard({
    required String title,
    required IconData icon,
    VoidCallback? onEdit,
    required Widget child,
  }) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 20, offset: const Offset(0, 8)),
        ],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(icon, color: AppColors.primary, size: 22),
          const SizedBox(width: 10),
          Expanded(child: Text(title, style: AppTypography.h3().copyWith(color: AppColors.textPrimary))),
          if (onEdit != null)
            IconButton(
              tooltip: 'Edit',
              icon: const Icon(Icons.edit_outlined, size: 18),
              onPressed: onEdit,
            ),
        ]),
        const SizedBox(height: 12),
        const Divider(color: AppColors.surface, thickness: 1.3),
        const SizedBox(height: 10),
        child,
      ]),
    );
  }

  Widget _vendorBreakdown(CheckoutVendorEntry v) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 14, offset: const Offset(0, 4))]),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(padding: const EdgeInsets.all(8), decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.1), shape: BoxShape.circle), child: const Icon(IconlyBold.bag, color: AppColors.primary, size: 18)),
          const SizedBox(width: 10),
          Expanded(child: Text(v.vendorName, style: AppTypography.bodyLg().copyWith(fontWeight: FontWeight.w800))),
        ]),
        const SizedBox(height: 10),
        _line('Subtotal', v.subtotal),
        _line('Delivery fee', v.deliveryFee),
        if (v.serviceFee > 0) _line('Service fee', v.serviceFee),
        if (v.discount > 0) _line('Discount', -v.discount, AppColors.success),
        const Divider(height: 16),
        Row(children: [
          Expanded(child: Text('Payment', style: AppTypography.caption())),
          DropdownButton<CheckoutPayMethod>(
            value: v.method,
            underline: const SizedBox.shrink(),
            items: [
              const DropdownMenuItem(value: CheckoutPayMethod.prepaid, child: Text('Mobile Money / Card')),
              if (v.codAvailable) const DropdownMenuItem(value: CheckoutPayMethod.cash, child: Text('Cash on Delivery')),
            ],
            onChanged: (m) {
              if (m != null) ref.read(checkoutProvider.notifier).setMethod(v.vendorId, m);
            },
          ),
        ]),
      ]),
    );
  }

  Widget _line(String label, double amount, [Color? color]) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 2),
        child: Row(children: [
          Text(label, style: AppTypography.bodySm()),
          const Spacer(),
          Text(Formatters.money(amount), style: AppTypography.bodySm(color ?? AppColors.textPrimary).copyWith(fontWeight: FontWeight.w700)),
        ]),
      );
}
