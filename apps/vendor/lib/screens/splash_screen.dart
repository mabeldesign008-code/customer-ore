import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ore_core/ore_core.dart';

import '../core/router/app_router.dart';
import '../providers/auth/vendor_auth_provider.dart';
import '../providers/vendor_data_provider.dart';
import '../providers/auth/registration_provider.dart';

class VendorSplashScreen extends ConsumerStatefulWidget {
  const VendorSplashScreen({super.key});

  @override
  ConsumerState<VendorSplashScreen> createState() => _VendorSplashScreenState();
}

class _VendorSplashScreenState extends ConsumerState<VendorSplashScreen> {
  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    await Future.wait<void>([
      Future<void>.delayed(const Duration(milliseconds: 900)),
      ref.read(vendorAuthProvider).restoreSession(),
    ]);
    if (!mounted) return;
    final auth = ref.read(vendorAuthProvider);
    if (!auth.isLoggedIn) {
      context.go(VendorRoutes.login);
      return;
    }

    try {
      final status = await ref.read(vendorOnboardingRepositoryProvider).getStatus();
      ref.read(registrationProvider.notifier).hydrateFromApplication(status.stageData);
      if (!mounted) return;
      if (status.status == 'APPROVED') {
        context.go(VendorRoutes.dashboard);
      } else if (status.status == 'PENDING_REVIEW') {
        context.go(VendorRoutes.onboardingReview);
      } else {
        final draft = ref.read(registrationProvider);
        // KYC bytes are intentionally not persisted in backend stageData. On
        // a new process, resume at the earliest step that must be captured
        // again instead of allowing Stage 5 to fail with an opaque error.
        if (status.currentStage >= 3 && (draft.selfieBase64 == null || draft.angleImagesBase64.length < 6)) {
          context.go(VendorRoutes.onboardingOwner);
        } else if (status.currentStage >= 4 && draft.documentFrontBase64 == null) {
          context.go(VendorRoutes.onboardingDocs);
        } else {
          context.go(_routeForStage(status.currentStage));
        }
      }
    } catch (_) {
      // A temporary onboarding-service outage must not manufacture a status;
      // the dashboard will show the real Catalog/profile error and a retry.
      if (mounted) context.go(VendorRoutes.dashboard);
    }
  }

  String _routeForStage(int stage) {
    switch (stage.clamp(1, 5)) {
      case 1:
        return VendorRoutes.onboardingType;
      case 2:
        return VendorRoutes.onboardingBusiness;
      case 3:
        return VendorRoutes.onboardingOwner;
      case 4:
        return VendorRoutes.onboardingDocs;
      default:
        return VendorRoutes.onboardingBank;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [AppColors.primary, AppColors.primaryDark],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              const Spacer(),
              Center(
                child: Container(
                  width: 110,
                  height: 110,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(30),
                    boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.15), blurRadius: 30)],
                  ),
                  child: const Icon(Icons.storefront_rounded, color: AppColors.primary, size: 58),
                ).animate().scale(begin: const Offset(0.4, 0.4), duration: Motion.medium, curve: Motion.spring).then().shimmer(duration: 1200.ms, color: Colors.white.withOpacity(0.3)),
              ),
              const SizedBox(height: 24),
              Text('ore', style: AppTypography.h1(Colors.white).copyWith(fontSize: 44, letterSpacing: -1))
                  .animate()
                  .fadeIn(duration: Motion.medium)
                  .slideY(begin: 0.3),
              const SizedBox(height: 6),
              Text('For Vendors · Manage your store', style: AppTypography.body(Colors.white70))
                  .animate()
                  .fadeIn(duration: 400.ms, delay: 300.ms),
              const Spacer(),
              const SizedBox(width: 26, height: 26, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white)),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}
