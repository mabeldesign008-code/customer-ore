import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:ore_core/ore_core.dart' show OreSupportModal, OreToast, ToastType, Haptics;
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../providers/vendor_data_provider.dart';
import '../dashboard/vendor_dashboard_screen.dart';

class UnderReviewScreen extends ConsumerStatefulWidget {
  const UnderReviewScreen({
    super.key,
    this.status = 'PENDING_REVIEW',
    this.rejectionReason,
    this.requiresActionField,
  });

  final String status;
  final String? rejectionReason;
  final String? requiresActionField;

  @override
  ConsumerState<UnderReviewScreen> createState() => _UnderReviewScreenState();
}

class _UnderReviewScreenState extends ConsumerState<UnderReviewScreen> {
  late String _status;
  bool _refreshing = false;
  Timer? _pollTimer;

  @override
  void initState() {
    super.initState();
    _status = widget.status;
    Future<void>.microtask(() => _loadStatus());
    _pollTimer = Timer.periodic(const Duration(seconds: 5), (_) => _loadStatus(showMessage: false));
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadStatus({bool showMessage = true}) async {
    if (_refreshing) return;
    setState(() => _refreshing = true);
    try {
      final status = await ref.read(vendorOnboardingRepositoryProvider).getStatus();
      if (!mounted) return;
      setState(() => _status = status.status);
      if (['APPROVED', 'REJECTED', 'REQUIRES_ACTION'].contains(_status)) _pollTimer?.cancel();
      if (showMessage) OreToast.show(context, message: 'Application status refreshed', type: ToastType.success);
    } catch (_) {
      if (showMessage && mounted) OreToast.show(context, message: 'Unable to load application status', type: ToastType.error);
    } finally {
      if (mounted) setState(() => _refreshing = false);
    }
  }

  void _goToCatalogueSetup() {
    Haptics.success();
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const VendorDashboardScreen()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: Text('Application Status', style: AppTextStyles.heading3),
        actions: [
          IconButton(tooltip: 'Action', 
            icon: const Icon(LucideIcons.headset, color: AppColors.primary),
            onPressed: () => OreSupportModal.show(context, title: 'Store Review Support'),
          ),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              const Spacer(flex: 1),
              _buildStatusBody(),
              const Spacer(flex: 2),
              _buildActionFooter(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusBody() {
    if (_status == 'APPROVED') {
      return Column(
        children: [
          Container(
            width: 100,
            height: 100,
            decoration: BoxDecoration(
              color: AppColors.success.withOpacity(0.12),
              shape: BoxShape.circle,
            ),
            child: const Icon(LucideIcons.circleCheck, color: AppColors.success, size: 56),
          ),
          const SizedBox(height: 24),
          Text('Store Approved! 🎉', style: AppTextStyles.heading1),
          const SizedBox(height: 8),
          Text(
            'Your business documents and workplace GPS have been verified by Ore Compliance. Tap below to set up your store catalogue and start receiving orders.',
            textAlign: TextAlign.center,
            style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary),
          ),
        ],
      );
    }

    if (_status == 'REQUIRES_ACTION') {
      return Column(
        children: [
          Container(
            width: 100,
            height: 100,
            decoration: BoxDecoration(
              color: AppColors.warning.withOpacity(0.12),
              shape: BoxShape.circle,
            ),
            child: const Icon(LucideIcons.alertTriangle, color: AppColors.warning, size: 56),
          ),
          const SizedBox(height: 24),
          Text('Action Required', style: AppTextStyles.heading1),
          const SizedBox(height: 8),
          Text(
            'Compliance requires you to update the following item:',
            textAlign: TextAlign.center,
            style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.warning),
            ),
            child: Text(
              widget.requiresActionField ?? 'Please re-upload a clearer Business Registration certificate.',
              style: AppTextStyles.bodyTextSmall.copyWith(fontWeight: FontWeight.w600),
            ),
          ),
        ],
      );
    }

    // Default: PENDING_REVIEW
    return Column(
      children: [
        Container(
          width: 100,
          height: 100,
          decoration: BoxDecoration(
            color: AppColors.primary.withOpacity(0.12),
            shape: BoxShape.circle,
          ),
          child: const Icon(LucideIcons.store, color: AppColors.primary, size: 52),
        ),
        const SizedBox(height: 24),
        Text('Application Under Review', style: AppTextStyles.heading1),
        const SizedBox(height: 8),
        Text(
          'Your Smile ID identity, RGD business documents, and workplace GPS coordinates are being reviewed by the Ore Compliance team in Cape Coast.',
          textAlign: TextAlign.center,
          style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary),
        ),
        const SizedBox(height: 20),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(LucideIcons.clock, color: AppColors.primary, size: 18),
              const SizedBox(width: 8),
              Text('Average review time: 2–4 hours', style: AppTextStyles.bodyTextSmall),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildActionFooter() {
    if (_status == 'APPROVED') {
      return SizedBox(
        width: double.infinity,
        height: 52,
        child: ElevatedButton(
          onPressed: _goToCatalogueSetup,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          ),
          child: const Text(
            'Set Up Store Catalogue',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
          ),
        ),
      );
    }

    return Column(
      children: [
        SizedBox(
          width: double.infinity,
          height: 50,
          child: ElevatedButton(
            onPressed: _refreshing ? null : () => _loadStatus(),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
            child: _refreshing
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Text('Refresh application status', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          width: double.infinity,
          height: 48,
          child: OutlinedButton.icon(
            onPressed: () => OreSupportModal.show(context, title: 'Contact Compliance Team'),
            icon: const Icon(LucideIcons.headset, size: 18),
            label: const Text('Contact Support'),
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.primary,
              side: const BorderSide(color: AppColors.primary),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
          ),
        ),
      ],
    );
  }
}
