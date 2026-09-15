import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ore_core/ore_core.dart';

import '../core/ui/toast_x.dart';
import '../data/catalog/customer_voucher_repository.dart';
import '../providers/customer_auth_provider.dart';

final customerVoucherRepositoryProvider = Provider<CustomerVoucherRepository>((ref) {
  return CustomerVoucherRepository(ref.watch(customerApiClientProvider));
});

final customerVouchersProvider = FutureProvider<List<CustomerVoucher>>((ref) {
  return ref.watch(customerVoucherRepositoryProvider).list();
});

class VouchersScreen extends ConsumerStatefulWidget {
  const VouchersScreen({super.key});

  @override
  ConsumerState<VouchersScreen> createState() => _VouchersScreenState();
}

class _VouchersScreenState extends ConsumerState<VouchersScreen> {
  final _code = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  Future<void> _redeem() async {
    final code = _code.text.trim();
    if (code.length < 3) {
      context.showToast('Enter a voucher code of at least 3 characters.', type: ToastType.error);
      return;
    }
    setState(() => _saving = true);
    try {
      await ref.read(customerVoucherRepositoryProvider).redeem(code);
      _code.clear();
      ref.invalidate(customerVouchersProvider);
      if (mounted) context.showToast('Voucher saved. Ore applies it at checkout if still active.', type: ToastType.success);
    } catch (error) {
      if (!mounted) return;
      final message = error.toString().replaceFirst('Exception: ', '').trim();
      context.showToast(message.isEmpty ? 'That voucher could not be saved.' : message, type: ToastType.error);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final vouchers = ref.watch(customerVouchersProvider);
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(customerVouchersProvider);
            await ref.read(customerVouchersProvider.future);
          },
          color: AppColors.primary,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
            children: [
              Row(
                children: [
                  IconButton(tooltip: 'Action', onPressed: () => context.pop(), icon: const Icon(Icons.arrow_back_ios_new_rounded)),
                  Expanded(child: Text('Vouchers & offers', style: AppTypography.h3())),
                ],
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _code,
                textCapitalization: TextCapitalization.characters,
                decoration: const InputDecoration(
                  labelText: 'Add a vendor campaign code',
                  hintText: 'e.g. JOLLOF10',
                ),
              ),
              const SizedBox(height: 10),
              OreButton(
                label: 'Save voucher',
                isLoading: _saving,
                onPressed: _saving ? null : _redeem,
              ),
              const SizedBox(height: 8),
              Text(
                'Codes map onto live Vendor promotions. Invalid or expired codes are not saved as a second discount.',
                style: AppTypography.caption(),
              ),
              const SizedBox(height: 24),
              vouchers.when(
                loading: () => const Padding(
                  padding: EdgeInsets.only(top: 40),
                  child: Center(child: CircularProgressIndicator(semanticsLabel: 'Loading')),
                ),
                error: (error, _) => OreEmptyState(
                  icon: Icons.cloud_off_rounded,
                  title: 'Vouchers could not load',
                  subtitle: error.toString().replaceFirst('Exception: ', ''),
                  ctaLabel: 'Try again',
                  onCta: () => ref.invalidate(customerVouchersProvider),
                ),
                data: (rows) {
                  if (rows.isEmpty) {
                    return const OreEmptyState(
                      icon: Icons.local_activity_outlined,
                      title: 'No saved vouchers',
                      subtitle: 'Save an active Vendor campaign code here, or enter it at checkout.',
                    );
                  }
                  return Column(
                    children: [
                      for (final voucher in rows)
                        OreCard(
                          margin: const EdgeInsets.only(bottom: 10),
                          padding: const EdgeInsets.all(14),
                          child: Row(
                            children: [
                              const Icon(Icons.local_activity_outlined, color: AppColors.primary),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(voucher.code, style: AppTypography.bodyLg().copyWith(fontWeight: FontWeight.w800)),
                                    Text(
                                      voucher.title.isEmpty ? 'Vendor campaign' : voucher.title,
                                      style: AppTypography.bodySm(),
                                    ),
                                    Text(
                                      voucher.active
                                          ? (voucher.endsAt == null
                                              ? 'Active'
                                              : 'Active until ${Formatters.formatDate(voucher.endsAt!)}')
                                          : 'No longer active',
                                      style: AppTypography.caption(voucher.active ? AppColors.success : AppColors.textMuted),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                    ],
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}
