import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:ore_core/ore_core.dart';
import 'package:flutter_animate/flutter_animate.dart';

class WelcomeScreen extends StatefulWidget {
  const WelcomeScreen({super.key});

  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<WelcomeScreen> {
  @override
  void initState() {
    super.initState();
    // Auto-advance after splash
    Future.delayed(const Duration(milliseconds: 2400), () {
      if (mounted) context.go('/onboarding');
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () => context.go('/onboarding'),
        child: SizedBox.expand(
          child: Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  AppColors.primaryLight,
                  AppColors.primary,
                  AppColors.primaryDark,
                ],
              ),
            ),
            child: Stack(
              children: [
                // Warm yellow accent blob (top-right)
                Positioned(
                  top: -40,
                  right: -60,
                  child: Container(
                    width: 220,
                    height: 220,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppColors.accent.withOpacity(0.18),
                    ),
                  ),
                ).animate().scale(
                    duration: 900.ms,
                    curve: Motion.spring,
                    begin: const Offset(0.4, 0.4)),
                // White glass blobs
                Positioned(
                  left: -100,
                  top: -50,
                  child: Transform.rotate(
                    angle: 0.6,
                    child: Container(
                      width: 250,
                      height: 400,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(100),
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Colors.white.withOpacity(0),
                            Colors.white.withOpacity(0.2),
                          ],
                        ),
                      ),
                    ),
                  ),
                ).animate().fadeIn(duration: Motion.slow).slideX(begin: -0.3),
                Positioned(
                  right: -100,
                  bottom: -50,
                  child: Transform.rotate(
                    angle: 0.6,
                    child: Container(
                      width: 250,
                      height: 400,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(100),
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Colors.white.withOpacity(0.2),
                            Colors.white.withOpacity(0),
                          ],
                        ),
                      ),
                    ),
                  ),
                ).animate().fadeIn(duration: Motion.slow).slideX(begin: 0.3),
                SafeArea(
                  child: Column(
                    children: [
                      const Spacer(flex: 2),
                      // Logo
                      Container(
                        width: 100,
                        height: 100,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(28),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.15),
                              blurRadius: 20,
                              offset: const Offset(0, 8),
                            ),
                          ],
                        ),
                        child: const Icon(Icons.flash_on_rounded,
                            color: AppColors.primary, size: 56),
                      )
                          .animate()
                          .scale(
                              duration: Motion.medium,
                              curve: Motion.spring,
                              begin: const Offset(0.4, 0.4))
                          .then()
                          .shimmer(
                              duration: 1.seconds,
                              color: Colors.white.withOpacity(0.3)),
                      const SizedBox(height: 24),
                      Text(
                        'ore',
                        style: AppTypography.h1(Colors.white).copyWith(
                          fontSize: 48,
                          fontWeight: FontWeight.w800,
                          letterSpacing: -1,
                        ),
                      )
                          .animate()
                          .fadeIn(
                              delay: 200.ms, duration: Motion.medium)
                          .slideY(begin: 0.2),
                      const SizedBox(height: 8),
                      Text(
                        'Delivered fast.',
                        style: AppTypography.bodyLg(Colors.white70),
                      ).animate().fadeIn(delay: 400.ms),
                      const Spacer(flex: 3),
                      // Pager dots with yellow accent
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          for (int i = 0; i < 4; i++)
                            Container(
                              margin:
                                  const EdgeInsets.symmetric(horizontal: 4),
                              width: i == 0 ? 24 : 8,
                              height: 8,
                              decoration: BoxDecoration(
                                color: i == 0
                                    ? AppColors.accent
                                    : Colors.white.withOpacity(0.4),
                                borderRadius: BorderRadius.circular(4),
                              ),
                            ),
                        ],
                      ).animate().fadeIn(delay: 550.ms),
                      const SizedBox(height: 14),
                      Text(
                        'Food · Groceries · Parcel · Errands',
                        textAlign: TextAlign.center,
                        style: AppTypography.body(Colors.white70),
                      ).animate().fadeIn(delay: 600.ms),
                      const SizedBox(height: 8),
                      SizedBox(
                        width: 24,
                        height: 24,
                        child: const CircularProgressIndicator(
                            color: Colors.white, strokeWidth: 2),
                      ).animate().fadeIn(delay: 800.ms),
                      const SizedBox(height: 24),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
