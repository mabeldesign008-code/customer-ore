import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_slidable/flutter_slidable.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import 'package:skeletonizer/skeletonizer.dart';
import 'package:ore_core/ore_core.dart';

import '../core/ui/toast_x.dart';
import '../providers/customer_address_provider.dart';
import '../data/address/customer_address_repository.dart';
import '../providers/customer_catalog_provider.dart';
import '../widgets/customer_address_picker.dart';

class SavedAddressesScreen extends ConsumerStatefulWidget {
  const SavedAddressesScreen({super.key});

  @override
  ConsumerState<SavedAddressesScreen> createState() => _SavedAddressesScreenState();
}

class _SavedAddressesScreenState extends ConsumerState<SavedAddressesScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await ref.read(customerAddressBookProvider).ready;
    });
  }

  Future<void> _refresh() async {
    HapticFeedback.selectionClick();
    await ref.read(customerAddressBookProvider).reload();
    HapticFeedback.lightImpact();
  }

  Future<LatLng> _mapCenter() async {
    try {
      final location = await ref.read(customerLocationProvider.future);
      return LatLng(location.lat, location.lng);
    } catch (_) {
      // The map remains usable when the customer has denied device location;
      // they can still pin the exact point manually.
      return const LatLng(5.1174, -1.2990);
    }
  }

  Future<void> _addAddress() async {
    final center = await _mapCenter();
    if (!mounted) return;
    final result = await showModalBottomSheet<OreAddress>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => CustomerAddressPicker(
        title: 'Add saved address',
        initialPoint: center,
      ),
    );
    if (result == null || !mounted) return;
    await ref.read(customerAddressBookProvider).add(result);
    if (mounted) {
      context.showToast('Address saved', type: ToastType.success);
    }
  }

  @override
  Widget build(BuildContext context) {
    final book = ref.watch(customerAddressBookProvider);
    final items = book.addresses;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 8, 8, 8),
              child: Row(
                children: [
                  IconButton(tooltip: 'Action', 
                    onPressed: () => context.pop(),
                    icon: const Icon(Icons.arrow_back_ios_new_rounded),
                  ),
                  Expanded(child: Text('Saved Addresses', style: AppTypography.h3())),
                ],
              ),
            ),
            Expanded(
              child: RefreshIndicator(
                onRefresh: _refresh,
                color: AppColors.primary,
                child: Skeletonizer(
                  enabled: book.loading,
                  child: book.loading
                      ? ListView.builder(
                          physics: const AlwaysScrollableScrollPhysics(),
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: 4,
                          itemBuilder: (_, __) => _skeleton(),
                        )
                      : items.isEmpty
                          ? ListView(
                              physics: const AlwaysScrollableScrollPhysics(),
                              children: [
                                const SizedBox(height: 80),
                                OreEmptyState(
                                  icon: Icons.location_off_rounded,
                                  title: 'No saved addresses',
                                  subtitle: book.error ?? 'Pin your home, work or other places for faster checkout.',
                                  ctaLabel: 'Add an address',
                                  onCta: _addAddress,
                                ),
                              ],
                            )
                          : ListView.builder(
                              physics: const AlwaysScrollableScrollPhysics(),
                              padding: const EdgeInsets.fromLTRB(16, 4, 16, 100),
                              itemCount: items.length,
                              itemBuilder: (_, index) => _addressCard(items[index], index),
                            ),
                ),
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: AnimatedPress(
        onTap: () {
          HapticFeedback.mediumImpact();
          _addAddress();
        },
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
          decoration: BoxDecoration(
            color: AppColors.primary,
            borderRadius: BorderRadius.circular(100),
            boxShadow: [
              BoxShadow(
                color: AppColors.primary.withOpacity(0.35),
                blurRadius: 18,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: const Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.add_rounded, color: Colors.white, size: 20),
              SizedBox(width: 8),
              Text(
                'Add Address',
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
            ],
          ),
        ),
      ).animate().fadeIn(duration: 400.ms).scale(
            begin: const Offset(0.8, 0.8),
            curve: Curves.easeOutBack,
          ),
    );
  }

  Widget _addressCard(CustomerSavedAddress item, int index) {
    final book = ref.read(customerAddressBookProvider);
    return Slidable(
      key: ValueKey(item.id),
      startActionPane: !item.isDefault
          ? ActionPane(
              extentRatio: 0.3,
              motion: const DrawerMotion(),
              children: [
                SlidableAction(
                  onPressed: (_) async {
                    await book.setDefault(item.id);
                    if (mounted) {
                      context.showToast('${item.label} set as default', type: ToastType.success);
                    }
                  },
                  backgroundColor: AppColors.success,
                  foregroundColor: Colors.white,
                  icon: Icons.star_rounded,
                  label: 'Default',
                  borderRadius: BorderRadius.circular(14),
                ),
              ],
            )
          : null,
      endActionPane: ActionPane(
        extentRatio: 0.28,
        motion: const StretchMotion(),
        dismissible: DismissiblePane(
          onDismissed: () async {
            await book.remove(item.id);
            if (mounted) context.showToast('Address removed', type: ToastType.info);
          },
        ),
        children: [
          SlidableAction(
            onPressed: (_) async {
              await book.remove(item.id);
              if (mounted) context.showToast('Address removed', type: ToastType.info);
            },
            backgroundColor: AppColors.danger,
            foregroundColor: Colors.white,
            icon: Icons.delete_outline_rounded,
            label: 'Delete',
            borderRadius: BorderRadius.circular(14),
          ),
        ],
      ),
      child: OreCard(
        margin: const EdgeInsets.only(bottom: 12),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: item.isDefault
                    ? AppColors.primary.withOpacity(0.1)
                    : AppColors.background,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(item.icon, color: AppColors.primary),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        item.label,
                        style: AppTypography.bodyLg().copyWith(fontWeight: FontWeight.w800),
                      ),
                      if (item.isDefault) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppColors.success.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            'Default',
                            style: AppTypography.caption(AppColors.success).copyWith(fontSize: 10),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(item.displayAddress, style: AppTypography.bodySm()),
                  if (item.address.lat != null && item.address.lng != null)
                    Text(
                      '${item.address.lat!.toStringAsFixed(5)}, ${item.address.lng!.toStringAsFixed(5)}',
                      style: AppTypography.caption(AppColors.textMuted),
                    ),
                ],
              ),
            ),
            const Icon(Icons.pin_drop_rounded, color: AppColors.textMuted, size: 20),
          ],
        ),
      ),
    ).animate(delay: Duration(milliseconds: 50 * index)).fadeIn(duration: 350.ms).slideY(begin: 0.15);
  }

  Widget _skeleton() => Container(
        margin: const EdgeInsets.only(bottom: 12),
        height: 80,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
        ),
      );
}
