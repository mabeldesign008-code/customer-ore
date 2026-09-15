import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:ore_core/ore_core.dart';

import '../../data/auth/rider_api_client_provider.dart';
import '../../data/dispatch/rider_dispatch_repository.dart';
import '../../providers/rider_provider.dart';

class RiderErrandShoppingScreen extends ConsumerStatefulWidget {
  const RiderErrandShoppingScreen({super.key, required this.orderId});

  final String orderId;

  @override
  ConsumerState<RiderErrandShoppingScreen> createState() => _RiderErrandShoppingScreenState();
}

class _RiderErrandShoppingScreenState extends ConsumerState<RiderErrandShoppingScreen> {
  final _amount = TextEditingController();
  final _receiptNote = TextEditingController();
  final _substitutionItem = TextEditingController();
  final _substitutionPrice = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _amount.dispose();
    _receiptNote.dispose();
    _substitutionItem.dispose();
    _substitutionPrice.dispose();
    super.dispose();
  }

  Future<void> _refresh() async {
    try {
      await ref.read(tripsProvider).refreshCurrentOrder();
    } catch (_) {
      if (mounted) OreToast.show(context, message: 'Unable to refresh the Errand state.', type: ToastType.error);
    }
  }

  Future<void> _startShoppingIfNeeded(RiderTrip trip) async {
    final errand = trip.errand;
    if (errand == null || errand.isShopping || errand.isPurchased) return;
    setState(() => _busy = true);
    try {
      await ref.read(riderOrderRepositoryProvider).startErrandShopping(widget.orderId);
      await _refresh();
    } catch (error) {
      if (mounted) OreToast.show(context, message: error.toString(), type: ToastType.error);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _submitReceipt() async {
    final parsed = double.tryParse(_amount.text.trim().replaceAll(',', ''));
    if (parsed == null || parsed <= 0) {
      OreToast.show(context, message: 'Enter the receipt amount in GHS.', type: ToastType.error);
      return;
    }
    final photo = await ImagePicker().pickImage(source: ImageSource.camera, imageQuality: 82, maxWidth: 1800);
    if (photo == null) return;
    setState(() => _busy = true);
    try {
      await ref.read(riderOrderRepositoryProvider).submitErrandReceipt(
            orderId: widget.orderId,
            amountPesewas: (parsed * 100).round(),
            photo: photo,
            note: _receiptNote.text,
          );
      _amount.clear();
      _receiptNote.clear();
      await _refresh();
      if (mounted) OreToast.show(context, message: 'Receipt submitted.', type: ToastType.success);
    } catch (error) {
      if (mounted) OreToast.show(context, message: error.toString(), type: ToastType.error);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _requestSubstitution() async {
    final item = _substitutionItem.text.trim();
    final parsed = double.tryParse(_substitutionPrice.text.trim().replaceAll(',', ''));
    if (item.length < 2 || parsed == null || parsed <= 0) {
      OreToast.show(context, message: 'Enter the substitute item and price.', type: ToastType.error);
      return;
    }
    setState(() => _busy = true);
    try {
      await ref.read(riderOrderRepositoryProvider).requestErrandSubstitution(
            orderId: widget.orderId,
            item: item,
            pricePesewas: (parsed * 100).round(),
          );
      _substitutionItem.clear();
      _substitutionPrice.clear();
      await _refresh();
      if (mounted) OreToast.show(context, message: 'Waiting for customer approval.', type: ToastType.info);
    } catch (error) {
      if (mounted) OreToast.show(context, message: error.toString(), type: ToastType.error);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _readyForDelivery(RiderErrandContext errand) async {
    if (!errand.isPurchased || errand.substitution?['status'] == 'PENDING') return;
    setState(() => _busy = true);
    try {
      await ref.read(riderOrderRepositoryProvider).readyErrandForDelivery(widget.orderId);
      await _refresh();
      if (mounted) Navigator.of(context).pop();
    } catch (error) {
      if (mounted) OreToast.show(context, message: error.toString(), type: ToastType.error);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final trip = ref.watch(tripsProvider).currentTrip;
    final errand = trip?.id == widget.orderId ? trip?.errand : null;
    if (errand == null) {
      return Scaffold(appBar: AppBar(title: const Text('Errand')), body: const Center(child: Text('Errand details are unavailable.')));
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Shop for customer'),
        actions: [
          IconButton(tooltip: 'Action', onPressed: _busy ? null : _refresh, icon: const Icon(LucideIcons.refreshCw)),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(color: AppColors.errand.withOpacity(0.1), borderRadius: BorderRadius.circular(18)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                const Icon(LucideIcons.shoppingBag, color: AppColors.errand),
                const SizedBox(width: 8),
                Expanded(child: Text(errand.shopName ?? 'Errand shop', style: AppTypography.h3())),
                Text(errand.errandStatus, style: AppTypography.caption(AppColors.errand).copyWith(fontWeight: FontWeight.w800)),
              ]),
              const SizedBox(height: 12),
              Text(errand.task, style: AppTypography.bodyLg().copyWith(fontWeight: FontWeight.w700)),
              const SizedBox(height: 14),
              Row(children: [
                Expanded(child: _money('Budget', errand.budgetPesewas)),
                Expanded(child: _money('Spent', errand.spentPesewas)),
                Expanded(child: _money('Remaining', errand.remainingBudgetPesewas)),
              ]),
            ]),
          ),
          const SizedBox(height: 18),
          if (!errand.isShopping && !errand.isPurchased)
            OreButton(label: 'Start shopping', icon: LucideIcons.shoppingCart, isLoading: _busy, onPressed: _busy ? null : () => _startShoppingIfNeeded(trip!)),
          if (errand.substitution?['status'] == 'PENDING')
            Container(
              margin: const EdgeInsets.only(top: 14),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: AppColors.warning.withOpacity(0.12), borderRadius: BorderRadius.circular(14)),
              child: Text('Waiting for the customer to approve or reject your substitution.', style: AppTypography.body().copyWith(fontWeight: FontWeight.w700)),
            ),
          if (errand.isShopping) ...[
            const SizedBox(height: 20),
            Text('Submit purchase receipt', style: AppTypography.h3()),
            const SizedBox(height: 8),
            Text('Capture a clear itemized receipt. Do not spend above the remaining budget.', style: AppTypography.bodySm()),
            const SizedBox(height: 12),
            TextField(controller: _amount, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(labelText: 'Receipt total in GHS', prefixText: '₵ ')),
            const SizedBox(height: 10),
            TextField(controller: _receiptNote, maxLines: 2, decoration: const InputDecoration(labelText: 'Receipt note (optional)')),
            const SizedBox(height: 12),
            OutlinedButton.icon(onPressed: _busy ? null : _submitReceipt, icon: const Icon(LucideIcons.camera), label: const Text('Capture and submit receipt')),
            const SizedBox(height: 20),
            Text('Item unavailable?', style: AppTypography.h3()),
            const SizedBox(height: 8),
            TextField(controller: _substitutionItem, decoration: const InputDecoration(labelText: 'Suggested substitute')),
            const SizedBox(height: 10),
            TextField(controller: _substitutionPrice, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(labelText: 'Substitute price in GHS', prefixText: '₵ ')),
            const SizedBox(height: 10),
            OutlinedButton.icon(onPressed: _busy ? null : _requestSubstitution, icon: const Icon(LucideIcons.messageCircle), label: const Text('Ask customer about substitute')),
          ],
          if (errand.isPurchased) ...[
            const SizedBox(height: 20),
            Text('Shopping complete?', style: AppTypography.h3()),
            const SizedBox(height: 8),
            Text('${errand.receiptCount} receipt(s) submitted. Resolve any pending substitution before continuing.', style: AppTypography.bodySm()),
            const SizedBox(height: 12),
            OreButton(label: 'Ready to deliver', icon: LucideIcons.packageCheck, isLoading: _busy, onPressed: _busy || errand.substitution?['status'] == 'PENDING' ? null : () => _readyForDelivery(errand)),
          ],
          const SizedBox(height: 80),
        ],
      ),
    );
  }

  Widget _money(String label, int amountPesewas) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label, style: AppTypography.caption()),
        const SizedBox(height: 2),
        Text(Formatters.money(amountPesewas / 100), style: AppTypography.body().copyWith(fontWeight: FontWeight.w800)),
      ]);
}
