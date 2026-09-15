import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:ore_core/ore_core.dart';
import '../../data/auth/rider_api_client_provider.dart';
import '../../data/onboarding/rider_onboarding_repository.dart';

/// Application status & review screen matching Ore Architecture Spec Section 1.4 & 3.
class RiderApplicationStatusScreen extends ConsumerStatefulWidget {
  const RiderApplicationStatusScreen({
    super.key,
    this.status = 'PENDING_REVIEW',
    this.requiresActionField,
    this.rejectionReason,
    this.stageToFix = 3,
  });

  final String status;
  final String? requiresActionField;
  final String? rejectionReason;
  final int stageToFix;

  @override
  ConsumerState<RiderApplicationStatusScreen> createState() => _RiderApplicationStatusScreenState();
}

class _RiderApplicationStatusScreenState extends ConsumerState<RiderApplicationStatusScreen> {
  late String _currentStatus;
  String? _requiresActionField;
  String? _rejectionReason;
  RiderApplication? _application;
  Timer? _pollTimer;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _currentStatus = widget.status;
    _requiresActionField = widget.requiresActionField;
    _rejectionReason = widget.rejectionReason;
    Future<void>.microtask(() => _loadStatus());
    _pollTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      if (_currentStatus != 'APPROVED' &&
          _currentStatus != 'REJECTED' &&
          _currentStatus != 'REQUIRES_ACTION') {
        _loadStatus(showErrors: false);
      }
    });
  }

  Future<void> _loadStatus({bool showErrors = true}) async {
    if (_loading) return;
    if (mounted) setState(() => _loading = true);

    try {
      final application = await ref
          .read(riderOnboardingRepositoryProvider)
          .getApplicationStatus();
      if (!mounted) return;
      setState(() {
        _application = application;
        _currentStatus = application.status;
        _requiresActionField = application.requiresActionField ?? widget.requiresActionField;
        _rejectionReason = application.reason ?? widget.rejectionReason;
      });
      if (_currentStatus == 'APPROVED' ||
          _currentStatus == 'REJECTED' ||
          _currentStatus == 'REQUIRES_ACTION') {
        _pollTimer?.cancel();
      }
    } on DioException catch (error) {
      if (showErrors && mounted) {
        OreToast.show(
          context,
          message: _statusErrorMessage(error),
          type: ToastType.error,
        );
      }
    } on FormatException {
      if (showErrors && mounted) {
        OreToast.show(
          context,
          message: 'The server returned an unexpected status response',
          type: ToastType.error,
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _statusErrorMessage(DioException error) {
    final body = error.response?.data;
    if (body is Map) {
      final envelope = body['error'];
      if (envelope is Map && envelope['message'] is String) {
        return envelope['message'] as String;
      }
      if (body['message'] is String) return body['message'] as String;
    }
    return error.type == DioExceptionType.connectionError
        ? 'No internet connection. Please try again.'
        : 'Unable to load application status. Please try again.';
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: Text('Application Status', style: AppTypography.h3()),
        actions: [
          IconButton(tooltip: 'Action', 
            icon: const Icon(LucideIcons.headset, color: AppColors.primary),
            onPressed: () => OreSupportModal.show(context, title: 'Rider Review Support'),
          ),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              const Spacer(flex: 1),
              _buildStatusCard(),
              const Spacer(flex: 2),
              _buildActionButtons(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusCard() {
    if (_currentStatus == 'APPROVED') {
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
          ).animate().scale(duration: Motion.medium, curve: Motion.spring),
          const SizedBox(height: 24),
          Text('You\'re Approved! 🎉', style: AppTypography.h1()),
          const SizedBox(height: 8),
          Text(
            'Your rider application has been approved by Ore Compliance. You are now authorized to accept delivery orders in Cape Coast.',
            textAlign: TextAlign.center,
            style: AppTypography.body(AppColors.textSecondary),
          ),
        ],
      );
    }

    if (_currentStatus == 'REQUIRES_ACTION') {
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
          ).animate().scale(duration: Motion.medium, curve: Motion.spring),
          const SizedBox(height: 24),
          Text('Action Required', style: AppTypography.h1()),
          const SizedBox(height: 8),
          Text(
            'Compliance requires correction on your application before final approval:',
            textAlign: TextAlign.center,
            style: AppTypography.body(AppColors.textSecondary),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.warning.withOpacity(0.5)),
            ),
            child: Row(
              children: [
                const Icon(LucideIcons.fileWarning, color: AppColors.warning),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(_requiresActionField ?? 'Document Image Blur', style: AppTypography.button()),
                      Text(
                        'Please re-upload a clear uncropped photo in Stage ${widget.stageToFix}.',
                        style: AppTypography.caption(AppColors.textSecondary),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      );
    }

    if (_currentStatus == 'REJECTED') {
      return Column(
        children: [
          Container(
            width: 100,
            height: 100,
            decoration: BoxDecoration(
              color: AppColors.danger.withOpacity(0.12),
              shape: BoxShape.circle,
            ),
            child: const Icon(LucideIcons.xCircle, color: AppColors.danger, size: 56),
          ).animate().scale(duration: Motion.medium, curve: Motion.spring),
          const SizedBox(height: 24),
          Text('Application Not Approved', style: AppTypography.h1()),
          const SizedBox(height: 8),
          Text(
            _rejectionReason ?? 'Credentials did not match national verification database.',
            textAlign: TextAlign.center,
            style: AppTypography.body(AppColors.textSecondary),
          ),
          const SizedBox(height: 16),
          Text(
            'You may appeal or submit a new application after the cooldown window (7 days).',
            textAlign: TextAlign.center,
            style: AppTypography.caption(AppColors.textMuted),
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
          child: const Icon(LucideIcons.clock, color: AppColors.primary, size: 56),
        ).animate().scale(duration: Motion.medium, curve: Motion.spring),
        const SizedBox(height: 24),
        Text('Application Under Review', style: AppTypography.h1()),
        const SizedBox(height: 8),
        Text(
          'Your Smile ID biometrics and documents have been submitted to Ore Compliance. Manual document review typically takes 2–4 hours.',
          textAlign: TextAlign.center,
          style: AppTypography.body(AppColors.textSecondary),
        ),
        if (_application?.smileVerification != null) ...[
          const SizedBox(height: 12),
          Text(
            'Verification status: ${_application!.smileVerification!.status}',
            style: AppTypography.caption(AppColors.textSecondary),
          ),
        ],
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
              const Icon(LucideIcons.bellRing, color: AppColors.primary, size: 18),
              const SizedBox(width: 8),
              Text('You will receive an SMS when approved', style: AppTypography.caption(AppColors.textPrimary)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildActionButtons() {
    if (_currentStatus == 'APPROVED') {
      return OreButton(
        label: 'Go to Rider Dashboard',
        onPressed: () {
          Haptics.success();
          context.go('/home');
        },
      );
    }

    if (_currentStatus == 'REQUIRES_ACTION') {
      return OreButton(
        label: 'Correct Stage ${widget.stageToFix}',
        onPressed: () {
          Haptics.medium();
          context.push('/onboarding-staged?stage=${widget.stageToFix}');
        },
      );
    }

    return Column(
      children: [
        OreButton(
          label: 'Refresh status',
          isLoading: _loading,
          onPressed: _loading ? null : () => _loadStatus(),
        ),
        const SizedBox(height: 12),
        OreButton.secondary(
          label: 'Contact Support',
          onPressed: () => OreSupportModal.show(context, title: 'Check Review Status'),
        ),
      ],
    );
  }
}
