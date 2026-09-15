import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ore_core/ore_core.dart';
import 'package:latlong2/latlong.dart';

import '../../data/auth/customer_auth_repository.dart';
import '../../data/payment/customer_payment_launcher.dart';
import '../../providers/customer_auth_provider.dart';
import '../../providers/customer_catalog_provider.dart';
import '../../widgets/customer_address_picker.dart';
import '../../core/ui/toast_x.dart';

/// Single multi-step Parcel-delivery screen (replaces 4 legacy screens with
/// one stepper-based flow for better UX and state management).
class ParcelFlowScreen extends ConsumerStatefulWidget {
  const ParcelFlowScreen({super.key});
  @override
  ConsumerState<ParcelFlowScreen> createState() => _ParcelFlowScreenState();
}

class _ParcelFlowScreenState extends ConsumerState<ParcelFlowScreen> {
  final PageController _page = PageController();
  int _step = 0;

  // Step 1
  int _categoryIdx = -1;
  final List<_CatOption> _categories = const [
    _CatOption('Documents', 'Papers, envelopes, thin files', Icons.description_outlined, 'Small'),
    _CatOption('Small Package', 'Fits in a shoebox (up to 2kg)', Icons.inventory_2_rounded, 'Medium'),
    _CatOption('Medium Package', 'Larger boxes (up to 10kg)', Icons.unarchive_outlined, 'Medium'),
    _CatOption('Large Package', 'Bulky / heavy items', Icons.inventory_2_outlined, 'Large'),
    _CatOption('Fragile', 'Glass, electronics — extra care', Icons.wine_bar_rounded, 'Fragile'),
  ];

  // Step 2 addresses
  final _pickupName = TextEditingController();
  final _pickupPhone = TextEditingController();
  final _pickupAddr = TextEditingController();
  final _dropName = TextEditingController();
  final _dropPhone = TextEditingController();
  final _dropAddr = TextEditingController();
  OreAddress? _pickupLocation;
  OreAddress? _dropoffLocation;
  bool _prohibitedItemsAccepted = false;

  // Step 3
  int _payIdx = 0;
  bool _placing = false;

  @override
  void dispose() {
    _page.dispose();
    _pickupName.dispose();
    _pickupPhone.dispose();
    _pickupAddr.dispose();
    _dropName.dispose();
    _dropPhone.dispose();
    _dropAddr.dispose();
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
    if (_step == 0) return _categoryIdx >= 0;
    if (_step == 1) {
      try {
        normalizeCustomerPhone(_pickupPhone.text.trim());
        normalizeCustomerPhone(_dropPhone.text.trim());
      } catch (_) {
        return false;
      }
      return _pickupName.text.trim().length >= 2 &&
          _dropName.text.trim().length >= 2 &&
          _pickupAddr.text.trim().isNotEmpty &&
          _dropAddr.text.trim().isNotEmpty &&
          _pickupLocation != null &&
          _dropoffLocation != null;
    }
    return true;
  }

  Map<String, dynamic> _addressPayload(OreAddress address) => <String, dynamic>{
        'label': address.label,
        'lat': address.lat,
        'lng': address.lng,
        'details': address.landmark,
        'source': 'CUSTOMER_MAP',
      };

  Future<void> _pickAddress({required bool pickup}) async {
    try {
      final location = await ref.read(customerLocationProvider.future);
      if (!mounted) return;
      final result = await showModalBottomSheet<OreAddress>(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (_) => CustomerAddressPicker(
          title: pickup ? 'Choose pickup location' : 'Choose recipient location',
          initialPoint: LatLng(location.lat, location.lng),
          initialLabel: pickup ? _pickupAddr.text : _dropAddr.text,
        ),
      );
      if (result == null || !mounted) return;
      setState(() {
        if (pickup) {
          _pickupLocation = result;
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

  Future<void> _submit() async {
    if (!ref.read(customerAuthProvider).isAuthenticated) {
      context.go('/get-started?returnTo=/parcel');
      return;
    }
    if (_pickupLocation == null || _dropoffLocation == null || !_prohibitedItemsAccepted) {
      context.showToast('Choose both map locations and accept the Parcel safety policy.', type: ToastType.error);
      return;
    }
    late final String senderPhone;
    late final String recipientPhone;
    try {
      senderPhone = normalizeCustomerPhone(_pickupPhone.text.trim());
      recipientPhone = normalizeCustomerPhone(_dropPhone.text.trim());
    } catch (_) {
      context.showToast('Enter both sender and recipient Ghana phone numbers.', type: ToastType.error);
      return;
    }
    if (_pickupName.text.trim().length < 2 || _dropName.text.trim().length < 2) {
      context.showToast('Enter the sender and recipient names.', type: ToastType.error);
      return;
    }
    setState(() => _placing = true);
    Haptics.medium();
    try {
      const weights = [0.5, 2.0, 10.0, 20.0, 2.0];
      final cat = _categories[_categoryIdx];
      final payload = <String, dynamic>{
        'sender': <String, dynamic>{
          'name': _pickupName.text.trim(),
          'phone': senderPhone,
          'address': _addressPayload(_pickupLocation!),
        },
        'recipient': <String, dynamic>{
          'name': _dropName.text.trim(),
          'phone': recipientPhone,
          'address': _addressPayload(_dropoffLocation!),
        },
        'category': cat.title.toUpperCase().replaceAll(' ', '_'),
        'weightKg': weights[_categoryIdx],
        'declaredValuePesewas': 0,
        'description': cat.title,
        'fragile': cat.title == 'Fragile',
        'sealed': true,
        'pickupMode': 'MEET_DOOR',
        'proofMode': 'PIN',
        'prohibitedItemsAcknowledged': true,
      };
      final result = await ref.read(customerRequestRepositoryProvider).createParcel(payload: payload);
      final orderId = result['orderId'] as String?;
      if (orderId == null || orderId.isEmpty) {
        throw const FormatException('Parcel creation did not return an order ID');
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
              Expanded(child: Text('Send a Parcel', style: AppTypography.h3())),
            ]),
          ),
        _stepper(),
        Expanded(
          child: PageView(
            controller: _page,
            physics: const NeverScrollableScrollPhysics(),
            children: [
              _categoryStep(),
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
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Text('STEP ${_step + 1} OF 3',
            style: AppTypography.caption(AppColors.primary).copyWith(fontWeight: FontWeight.w800, letterSpacing: 1),
          ),
          const Spacer(),
          Text(['What are you sending?', 'Pickup & delivery', 'Review & pay'][_step], style: AppTypography.caption()),
        ]),
        const SizedBox(height: 10),
        Row(children: [
          for (int i = 0; i < 3; i++) ...[
            Expanded(
              child: AnimatedContainer(
                duration: Motion.fast,
                height: 4,
                decoration: BoxDecoration(
                  color: i <= _step ? AppColors.primary : AppColors.border,
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

  Widget _categoryStep() {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Text('What are you sending?', style: AppTypography.h1().copyWith(fontSize: 26)),
        const SizedBox(height: 8),
        Text('Select the category that best fits your item.', style: AppTypography.body(AppColors.textSecondary)),
        const SizedBox(height: 28),
        for (int i = 0; i < _categories.length; i++)
          _catTile(i),
        const SizedBox(height: 16),
        OreCard(
          color: AppColors.info.withOpacity(0.08),
          padding: const EdgeInsets.all(16),
          child: Row(children: [
            const Icon(Icons.info_outline_rounded, color: AppColors.info, size: 20),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'Price is based on size and weight. You\'ll see the full fare before confirming.',
                style: AppTypography.bodySm(AppColors.info),
              ),
            ),
          ]),
        ),
      ],
    );
  }

  Widget _catTile(int i) {
    final c = _categories[i];
    final sel = _categoryIdx == i;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: AnimatedPress(
        onTap: () => setState(() => _categoryIdx = i),
        borderRadius: BorderRadius.circular(20),
        child: AnimatedContainer(
          duration: Motion.fast,
          curve: Motion.spring,
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: sel ? AppColors.primary : Colors.transparent, width: 2),
            boxShadow: [BoxShadow(color: Colors.black.withOpacity(sel ? 0.08 : 0.04), blurRadius: 14, offset: const Offset(0, 4))],
          ),
          child: Row(children: [
            Container(
              width: 52, height: 52,
              decoration: BoxDecoration(
                color: (sel ? AppColors.primary : AppColors.textMuted).withOpacity(0.1),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(c.icon, color: sel ? AppColors.primary : AppColors.textSecondary),
            ),
            const SizedBox(width: 14),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(c.title, style: AppTypography.bodyLg().copyWith(fontWeight: FontWeight.w700)),
              const SizedBox(height: 3),
              Text(c.sub, style: AppTypography.bodySm()),
            ])),
            AnimatedContainer(
              duration: Motion.fast,
              width: 24, height: 24,
              decoration: BoxDecoration(
                color: sel ? AppColors.primary : Colors.transparent,
                shape: BoxShape.circle,
                border: Border.all(color: sel ? AppColors.primary : AppColors.border, width: 2),
              ),
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
        Text('Pickup & delivery', style: AppTypography.h1().copyWith(fontSize: 26)),
        const SizedBox(height: 8),
        Text('Where\'s it going from and to?', style: AppTypography.body(AppColors.textSecondary)),
        const SizedBox(height: 24),
        _sectionLabel('PICKUP FROM', AppColors.primary),
        const SizedBox(height: 12),
        OreInput(hintText: 'Sender name', prefixIcon: Icons.person_rounded, controller: _pickupName),
        const SizedBox(height: 10),
        OreInput(
          hintText: 'Phone number',
          prefixIcon: Icons.phone_rounded,
          keyboardType: TextInputType.phone,
          controller: _pickupPhone,
        ),
        const SizedBox(height: 10),
        OreInput(hintText: 'Pickup address or landmark', prefixIcon: Icons.location_on_rounded, controller: _pickupAddr, maxLines: 2),
        const SizedBox(height: 8),
        OutlinedButton.icon(onPressed: () => _pickAddress(pickup: true), icon: const Icon(Icons.map_outlined), label: Text(_pickupLocation == null ? 'Pin pickup on map' : 'Pickup location pinned')),
        const SizedBox(height: 28),
        _sectionLabel('DELIVER TO', AppColors.success),
        const SizedBox(height: 12),
        OreInput(hintText: 'Recipient name', prefixIcon: Icons.person_rounded, controller: _dropName),
        const SizedBox(height: 10),
        OreInput(
          hintText: 'Recipient phone',
          prefixIcon: Icons.phone_rounded,
          keyboardType: TextInputType.phone,
          controller: _dropPhone,
        ),
        const SizedBox(height: 10),
        OreInput(hintText: 'Delivery address or landmark', prefixIcon: Icons.home_work_rounded, controller: _dropAddr, maxLines: 2),
        const SizedBox(height: 8),
        OutlinedButton.icon(onPressed: () => _pickAddress(pickup: false), icon: const Icon(Icons.map_outlined), label: Text(_dropoffLocation == null ? 'Pin recipient on map' : 'Recipient location pinned')),
        const SizedBox(height: 20),
        CheckboxListTile(
          contentPadding: EdgeInsets.zero,
          value: _prohibitedItemsAccepted,
          onChanged: (value) => setState(() => _prohibitedItemsAccepted = value ?? false),
          title: const Text('I confirm this sealed parcel contains no prohibited or unsafe item.'),
          controlAffinity: ListTileControlAffinity.leading,
        ),
        const SizedBox(height: 8),
        const SizedBox(height: 12),
        Text(
          'Ore calculates the final courier fare and ETA after validating both pinned locations.',
          style: AppTypography.bodySm(AppColors.textSecondary),
        ),
      ],
    );
  }

  Widget _sectionLabel(String label, Color c) => Row(children: [
    Container(width: 8, height: 8, decoration: BoxDecoration(color: c, shape: BoxShape.circle)),
    const SizedBox(width: 8),
    Text(label, style: AppTypography.caption(c).copyWith(fontSize: 11, letterSpacing: 1, fontWeight: FontWeight.w800)),
  ]);

  Widget _reviewStep() {
    if (_categoryIdx < 0) return const SizedBox.shrink();
    final cat = _categories[_categoryIdx];
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Text('Review your delivery', style: AppTypography.h1().copyWith(fontSize: 26)),
        const SizedBox(height: 8),
        Text('Confirm details and payment method', style: AppTypography.body(AppColors.textSecondary)),
        const SizedBox(height: 24),
        OreCard(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Icon(cat.icon, color: AppColors.primary),
              const SizedBox(width: 10),
              Expanded(child: Text(cat.title, style: AppTypography.bodyLg().copyWith(fontWeight: FontWeight.w700))),
              Text('From Ore', style: AppTypography.h3(AppColors.primary)),
            ]),
            const Divider(height: 24),
            _row(Icons.location_on_rounded, 'From', _pickupAddr.text.isEmpty ? 'Your location' : _pickupAddr.text),
            const SizedBox(height: 12),
            _row(Icons.home_work_rounded, 'To', _dropAddr.text.isEmpty ? 'Enter address' : _dropAddr.text),
            const SizedBox(height: 12),
            _row(Icons.account_balance_wallet_rounded, 'Fare', 'Calculated by Ore'),
          ]),
        ),
        const SizedBox(height: 20),
        Text('Payment method', style: AppTypography.h3()),
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
      _Pay(Icons.smartphone_rounded, 'Mobile Money / Card', 'Prepaid payment via Paystack', [AppColors.accent, AppColors.accentDark]),
    ];
    final m = methods[i];
    final sel = _payIdx == i;
    return AnimatedPress(
      onTap: () => setState(() => _payIdx = i),
      borderRadius: BorderRadius.circular(16),
      child: AnimatedContainer(
        duration: Motion.fast,
        curve: Motion.spring,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: sel ? AppColors.primary.withOpacity(0.05) : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: sel ? AppColors.primary : AppColors.border, width: sel ? 2 : 1),
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
            decoration: BoxDecoration(shape: BoxShape.circle, color: sel ? AppColors.primary : Colors.transparent, border: Border.all(color: sel ? AppColors.primary : AppColors.border, width: 2)),
            child: sel ? const Icon(Icons.check, color: Colors.white, size: 14) : null,
          ),
        ]),
      ),
    );
  }

  Widget _bottomBar() {
    final label = _step == 2 ? 'Book courier · Fees calculated by Ore' : 'Continue';
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
            icon: _step == 2 ? Icons.check_rounded : Icons.arrow_forward_ios_rounded,
            isLoading: _placing,
            onPressed: _canProceed() ? _next : null,
          ),
        ),
      ]),
    );
  }
}

class _CatOption {
  final String title, sub, size;
  final IconData icon;
  const _CatOption(this.title, this.sub, this.icon, this.size);
}

class _Pay {
  final IconData icon;
  final String title, sub;
  final List<Color> colors;
  const _Pay(this.icon, this.title, this.sub, this.colors);
}
