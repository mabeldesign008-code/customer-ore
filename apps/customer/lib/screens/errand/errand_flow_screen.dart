import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ore_core/ore_core.dart';
import 'package:latlong2/latlong.dart';

import '../../providers/customer_auth_provider.dart';
import '../../providers/customer_catalog_provider.dart';
import '../../data/payment/customer_payment_launcher.dart';
import '../../widgets/customer_address_picker.dart';
import '../../core/ui/toast_x.dart';

/// Multi-step errand booking: choose type → details → review/pay.
class ErrandFlowScreen extends ConsumerStatefulWidget {
  const ErrandFlowScreen({super.key});
  @override
  ConsumerState<ErrandFlowScreen> createState() => _ErrandFlowScreenState();
}

class _ErrandFlowScreenState extends ConsumerState<ErrandFlowScreen> {
  final PageController _page = PageController();
  int _step = 0;

  int _typeIdx = -1;
  final List<_TypeOpt> _types = const [
    _TypeOpt('Pickup & Drop-off', 'Pick up an item and deliver it somewhere', Icons.sync_alt_rounded, Color(0xFF3B82F6)),
    _TypeOpt('Buy & Deliver', 'Purchase items from a shop and deliver', Icons.shopping_bag_outlined, Color(0xFF16A34A)),
    _TypeOpt('Custom Errand', 'Describe what you need done', Icons.more_horiz_rounded, Color(0xFF8B5CF6)),
  ];

  final _title = TextEditingController();
  final _desc = TextEditingController();
  final _pickupAddr = TextEditingController();
  final _dropAddr = TextEditingController();
  final _budget = TextEditingController();
  OreAddress? _shopLocation;
  OreAddress? _dropoffLocation;
  int _payIdx = 0;
  bool _placing = false;

  @override
  void dispose() {
    _page.dispose();
    _title.dispose();
    _desc.dispose();
    _pickupAddr.dispose();
    _dropAddr.dispose();
    _budget.dispose();
    super.dispose();
  }

  void _next() {
    Haptics.medium();
    if (_step < 2) {
      _page.nextPage(duration: Motion.normal, curve: Motion.spring);
      setState(() => _step++);
    } else {
      _submit();
    }
  }

  void _back() {
    Haptics.light();
    if (_step > 0) {
      _page.previousPage(duration: Motion.normal, curve: Motion.spring);
      setState(() => _step--);
    } else {
      context.pop();
    }
  }

  bool _canProceed() {
    if (_step == 0) return _typeIdx >= 0;
    if (_step == 1) {
      final budget = double.tryParse(_budget.text.trim().replaceAll(',', ''));
      return _desc.text.trim().length >= 5 && _shopLocation != null && _dropoffLocation != null && budget != null && budget > 0;
    }
    return true;
  }

  String get _titleText => _typeIdx == -1 ? 'Errand' : _types[_typeIdx].title;

  Future<void> _pickAddress({required bool shop}) async {
    try {
      final location = await ref.read(customerLocationProvider.future);
      if (!mounted) return;
      final result = await showModalBottomSheet<OreAddress>(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (_) => CustomerAddressPicker(
          title: shop ? 'Choose shop location' : 'Choose delivery location',
          initialPoint: LatLng(location.lat, location.lng),
          initialLabel: shop ? _pickupAddr.text : _dropAddr.text,
        ),
      );
      if (result == null || !mounted) return;
      setState(() {
        if (shop) {
          _shopLocation = result;
          _pickupAddr.text = result.label;
        } else {
          _dropoffLocation = result;
          _dropAddr.text = result.label;
        }
      });
    } catch (error) {
      if (mounted) context.showToast(error.toString(), type: ToastType.error);
    }
  }

  Map<String, dynamic> _addressPayload(OreAddress address) => <String, dynamic>{
        'label': address.label,
        'lat': address.lat,
        'lng': address.lng,
        'details': address.landmark,
        'source': 'CUSTOMER_MAP',
      };

  Future<void> _submit() async {
    if (!ref.read(customerAuthProvider).isAuthenticated) {
      context.go('/get-started?returnTo=/errand');
      return;
    }
    final budget = double.tryParse(_budget.text.trim().replaceAll(',', ''));
    if (_shopLocation == null || _dropoffLocation == null || budget == null || budget <= 0 || _desc.text.trim().length < 5) {
      context.showToast('Pin the shop and delivery locations, then enter a task and budget.', type: ToastType.error);
      return;
    }
    setState(() => _placing = true);
    Haptics.medium();
    try {
      final result = await ref.read(customerRequestRepositoryProvider).createErrand(payload: <String, dynamic>{
        'task': _desc.text.trim(),
        'shopName': _pickupAddr.text.trim().isEmpty ? 'Errand shop' : _pickupAddr.text.trim(),
        'shopLat': _shopLocation!.lat,
        'shopLng': _shopLocation!.lng,
        'budgetPesewas': (budget * 100).round(),
        'address': _addressPayload(_dropoffLocation!),
        'note': _title.text.trim().isEmpty ? null : _title.text.trim(),
      });
      final orderId = result['orderId'] as String?;
      if (orderId == null || orderId.isEmpty) {
        throw const FormatException('Errand creation did not return an order ID');
      }
      final payment = result['payment'];
      final paystackUrl = payment is Map ? payment['paystackUrl'] as String? : null;
      final opened = await openCustomerPayment(paystackUrl);
      if (paystackUrl != null && paystackUrl.isNotEmpty && !opened && mounted) {
        context.showToast('Payment page could not be opened. Refresh the order to check its status.', type: ToastType.error);
      }
      if (!mounted) return;
      context.go('/order-confirm/$orderId');
    } catch (error) {
      if (mounted) context.showToast(error.toString(), type: ToastType.error);
    } finally {
      if (mounted) setState(() => _placing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(8, 8, 8, 0),
            child: Row(children: [
              IconButton(tooltip: 'Action', icon: const Icon(Icons.close_rounded), onPressed: _back),
              Expanded(child: Text('Run an Errand', style: AppTypography.h3())),
            ]),
          ),
        _stepper(),
        Expanded(
          child: PageView(
            controller: _page,
            physics: const NeverScrollableScrollPhysics(),
            children: [
              _typeStep(),
              _detailsStep(),
              _reviewStep(),
            ],
          ),
        ),
        _bottomBar(),
        ]),
      ),
    );
  }

  Widget _stepper() {
    final labels = ['Choose type', 'Details', 'Review & pay'];
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Text('STEP ${_step + 1} OF 3',
            style: AppTypography.caption(AppColors.errand).copyWith(fontWeight: FontWeight.w800, letterSpacing: 1),
          ),
          const Spacer(),
          Text(labels[_step], style: AppTypography.caption()),
        ]),
        const SizedBox(height: 10),
        Row(children: [
          for (int i = 0; i < 3; i++) ...[
            Expanded(
              child: AnimatedContainer(
                duration: Motion.fast,
                height: 4,
                decoration: BoxDecoration(
                  color: i <= _step ? AppColors.errand : AppColors.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            if (i < 2) const SizedBox(width: 6),
          ]
        ]),
      ]),
    );
  }

  Widget _typeStep() {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Text('What do you need?', style: AppTypography.h1().copyWith(fontSize: 26)),
        const SizedBox(height: 8),
        Text('Choose the type of errand you want to run', style: AppTypography.body(AppColors.textSecondary)),
        const SizedBox(height: 28),
        for (int i = 0; i < _types.length; i++)
          _typeTile(i),
      ],
    );
  }

  Widget _typeTile(int i) {
    final t = _types[i];
    final sel = _typeIdx == i;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: AnimatedPress(
        onTap: () => setState(() => _typeIdx = i),
        borderRadius: BorderRadius.circular(20),
        child: AnimatedContainer(
          duration: Motion.fast,
          curve: Motion.spring,
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: sel ? t.color : Colors.transparent, width: 2),
            boxShadow: [BoxShadow(color: Colors.black.withOpacity(sel ? 0.08 : 0.04), blurRadius: 14, offset: const Offset(0, 4))],
          ),
          child: Row(children: [
            Container(
              width: 56, height: 56,
              decoration: BoxDecoration(
                color: t.color.withOpacity(0.12),
                borderRadius: BorderRadius.circular(18),
              ),
              child: Icon(t.icon, color: t.color, size: 26),
            ),
            const SizedBox(width: 14),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(t.title, style: AppTypography.bodyLg().copyWith(fontWeight: FontWeight.w700)),
              const SizedBox(height: 3),
              Text(t.sub, style: AppTypography.bodySm()),
            ])),
            AnimatedContainer(
              duration: Motion.fast,
              width: 24, height: 24,
              decoration: BoxDecoration(color: sel ? t.color : Colors.transparent, shape: BoxShape.circle, border: Border.all(color: sel ? t.color : AppColors.border, width: 2)),
              child: sel ? const Icon(Icons.check, color: Colors.white, size: 16) : null,
            ),
          ]),
        ),
      ),
    );
  }

  Widget _detailsStep() {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Text('Tell us more', style: AppTypography.h1().copyWith(fontSize: 26)),
        const SizedBox(height: 8),
        Text(_typeIdx == 2 ? 'Describe what you need done clearly' : 'Share pickup and delivery details', style: AppTypography.body(AppColors.textSecondary)),
        const SizedBox(height: 24),
        _sectionLabel('SHOP LOCATION', AppColors.info),
        const SizedBox(height: 10),
        OreInput(hintText: 'Shop address or landmark', prefixIcon: Icons.location_on_rounded, controller: _pickupAddr, maxLines: 2),
        const SizedBox(height: 8),
        OutlinedButton.icon(onPressed: () => _pickAddress(shop: true), icon: const Icon(Icons.map_outlined), label: Text(_shopLocation == null ? 'Pin shop on map' : 'Shop location pinned')),
        const SizedBox(height: 20),
        _sectionLabel('DELIVER TO', AppColors.success),
        const SizedBox(height: 10),
        OreInput(hintText: 'Delivery address or landmark', prefixIcon: Icons.home_work_rounded, controller: _dropAddr, maxLines: 2),
        const SizedBox(height: 8),
        OutlinedButton.icon(onPressed: () => _pickAddress(shop: false), icon: const Icon(Icons.map_outlined), label: Text(_dropoffLocation == null ? 'Pin delivery on map' : 'Delivery location pinned')),
        const SizedBox(height: 20),
        _sectionLabel('DESCRIPTION', AppColors.errand),
        const SizedBox(height: 10),
        OreInput(
          hintText: 'E.g. "Pick up my laptop from the office and bring it home"',
          prefixIcon: Icons.description_outlined,
          controller: _desc,
          maxLines: 4,
        ),
        const SizedBox(height: 20),
        _sectionLabel('MAX SHOPPING BUDGET (REQUIRED)', AppColors.warning),
        const SizedBox(height: 10),
        OreInput(
          hintText: '0.00',
          prefixIcon: Icons.account_balance_wallet_rounded,
          controller: _budget,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
        ),
      ],
    );
  }

  Widget _sectionLabel(String l, Color c) => Row(children: [
    Container(width: 8, height: 8, decoration: BoxDecoration(color: c, shape: BoxShape.circle)),
    const SizedBox(width: 8),
    Text(l, style: AppTypography.caption(c).copyWith(fontSize: 11, letterSpacing: 1, fontWeight: FontWeight.w800)),
  ]);

  Widget _reviewStep() {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Text('Review & pay', style: AppTypography.h1().copyWith(fontSize: 26)),
        const SizedBox(height: 8),
        Text('Confirm your errand details', style: AppTypography.body(AppColors.textSecondary)),
        const SizedBox(height: 24),
        if (_typeIdx >= 0) OreCard(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Icon(_types[_typeIdx].icon, color: _types[_typeIdx].color),
              const SizedBox(width: 10),
              Expanded(child: Text(_titleText, style: AppTypography.bodyLg().copyWith(fontWeight: FontWeight.w700))),
              Text('From Ore', style: AppTypography.h3(AppColors.errand)),
            ]),
            if (_desc.text.trim().isNotEmpty) ...[
              const Divider(height: 24),
              Text(_desc.text.trim(), style: AppTypography.body()),
            ],
            if (_pickupAddr.text.trim().isNotEmpty) ...[
              const Divider(height: 24),
              _row(Icons.location_on_rounded, 'From', _pickupAddr.text.trim()),
            ],
            if (_dropAddr.text.trim().isNotEmpty) ...[
              const SizedBox(height: 12),
              _row(Icons.home_work_rounded, 'To', _dropAddr.text.trim()),
            ],
            const SizedBox(height: 12),
            _row(Icons.account_balance_wallet_rounded, 'Shopping budget', '₵${_budget.text.trim()}'),
          ]),
        ),
        const SizedBox(height: 20),
        Text('Prepaid escrow', style: AppTypography.h3()),
        const SizedBox(height: 12),
        for (int i = 0; i < 1; i++)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: _payTile(i),
          ),
      ],
    );
  }

  Widget _row(IconData i, String label, String val) => Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
    Icon(i, size: 18, color: AppColors.textSecondary),
    const SizedBox(width: 10),
    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: AppTypography.caption()),
      const SizedBox(height: 2),
      Text(val, style: AppTypography.bodyLg().copyWith(fontWeight: FontWeight.w600)),
    ])),
  ]);

  Widget _payTile(int i) {
    const methods = [
      _Pay(Icons.smartphone_rounded, 'Mobile Money / Card', 'Prepaid escrow via Paystack', [AppColors.accent, AppColors.accentDark]),
    ];
    final m = methods[i];
    final sel = _payIdx == i;
    return AnimatedPress(
      onTap: () => setState(() => _payIdx = i),
      borderRadius: BorderRadius.circular(16),
      child: AnimatedContainer(
        duration: Motion.fast, curve: Motion.spring,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: sel ? AppColors.errand.withOpacity(0.05) : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: sel ? AppColors.errand : AppColors.border, width: sel ? 2 : 1),
        ),
        child: Row(children: [
          Container(width: 46, height: 46, decoration: BoxDecoration(gradient: LinearGradient(colors: m.colors), borderRadius: BorderRadius.circular(14)), child: Icon(m.icon, color: Colors.white)),
          const SizedBox(width: 14),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(m.title, style: AppTypography.bodyLg().copyWith(fontWeight: FontWeight.w700)),
            Text(m.sub, style: AppTypography.bodySm()),
          ])),
          AnimatedContainer(
            duration: Motion.fast,
            width: 22, height: 22,
            decoration: BoxDecoration(shape: BoxShape.circle, color: sel ? AppColors.errand : Colors.transparent, border: Border.all(color: sel ? AppColors.errand : AppColors.border, width: 2)),
            child: sel ? const Icon(Icons.check, color: Colors.white, size: 14) : null,
          ),
        ]),
      ),
    );
  }

  Widget _bottomBar() {
    final label = _step == 2 ? 'Book errand · Fees calculated by Ore' : 'Continue';
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 14),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.08), blurRadius: 20, offset: const Offset(0, -6))],
      ),
      child: Row(children: [
        if (_step > 0)
          AnimatedPress(
            onTap: _back,
            borderRadius: BorderRadius.circular(14),
            child: Container(
              width: 48, height: 48,
              decoration: BoxDecoration(color: AppColors.background, borderRadius: BorderRadius.circular(14)),
              child: const Icon(Icons.arrow_back_ios_new_rounded),
            ),
          ),
        if (_step > 0) const SizedBox(width: 12),
        Expanded(
          child: OreButton(
            label: label,
            color: AppColors.errand,
            icon: _step == 2 ? Icons.check_rounded : Icons.arrow_forward_ios_rounded,
            isLoading: _placing,
            onPressed: _canProceed() ? _next : null,
          ),
        ),
      ]),
    );
  }
}

class _TypeOpt {
  final String title, sub;
  final IconData icon;
  final Color color;
  const _TypeOpt(this.title, this.sub, this.icon, this.color);
}

class _Pay {
  final IconData icon;
  final String title, sub;
  final List<Color> colors;
  const _Pay(this.icon, this.title, this.sub, this.colors);
}
