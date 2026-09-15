import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ore_core/ore_core.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../providers/rider_provider.dart';
import '../../core/router/app_router.dart';

class RiderSplashScreen extends ConsumerStatefulWidget {
  const RiderSplashScreen({super.key});
  @override
  ConsumerState<RiderSplashScreen> createState() => _RiderSplashScreenState();
}

class _RiderSplashScreenState extends ConsumerState<RiderSplashScreen> {
  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    final auth = ref.read(riderAuthProvider);
    await Future.wait<void>([
      Future<void>.delayed(const Duration(milliseconds: 1800)),
      auth.restoreSession(),
    ]);
    if (!mounted) return;
    context.go(auth.isLoggedIn ? RiderRoutes.home : RiderRoutes.login);
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
              // Logo
              Center(
                child: Container(
                  width: 110,
                  height: 110,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(30),
                    boxShadow: [
                      BoxShadow(color: Colors.black.withOpacity(0.15), blurRadius: 30),
                    ],
                  ),
                  child: const Icon(LucideIcons.bike, size: 58, color: AppColors.primary),
                ).animate().scale(begin: const Offset(0.4, 0.4), duration: Motion.medium, curve: Motion.spring).then().shimmer(duration: 1200.ms, color: Colors.white.withOpacity(0.3)),
              ),
              const SizedBox(height: 24),
              Text('ore',
                style: AppTypography.h1(Colors.white).copyWith(fontSize: 44, letterSpacing: -1),
              ).animate().fadeIn(duration: Motion.medium).slideY(begin: 0.3),
              const SizedBox(height: 6),
              Text('Deliver faster. Earn more.',
                style: AppTypography.body(Colors.white70),
              ).animate().fadeIn(duration: 400.ms, delay: 300.ms),
              const Spacer(),
              const SizedBox(
                width: 26, height: 26,
                child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white),
              ),
              const SizedBox(height: 20),
              Text('For Riders', style: AppTypography.caption(Colors.white60)),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}
