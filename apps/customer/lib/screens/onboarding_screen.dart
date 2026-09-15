import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../core/ui/iconly_compat.dart';
import 'package:ore_core/ore_core.dart';
import '../providers/customer_auth_provider.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});
  @override State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  @override Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          Positioned.fill(
            child: Image.asset(
              'assets/images/home/onboarding_bg.jpg',
              fit: BoxFit.cover,
            ),
          ),
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [Colors.black.withOpacity(0.9), Colors.transparent, Colors.black.withOpacity(0.9)],
                  begin: Alignment.bottomCenter,
                  end: Alignment.topCenter,
                ),
              ),
            ),
          ),
          Positioned(
            left: 32, right: 32, bottom: 48,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Ore Delivery.',
                  style: AppTypography.display(Colors.white).copyWith(fontSize: 48),
                ).animate().fadeIn(duration: 600.ms).slideY(begin: 0.2),
                const SizedBox(height: 16),
                Text(
                  'Food, groceries, laundry, and errands — instantly delivered to your door.',
                  style: AppTypography.h3(Colors.white70).copyWith(height: 1.5, fontWeight: FontWeight.w500),
                ).animate().fadeIn(duration: 600.ms, delay: 200.ms).slideY(begin: 0.2),
                const SizedBox(height: 48),
                AnimatedPress(
                  onTap: () {
                    Haptics.selection();
                    context.go('/get-started');
                  },
                  child: Container(
                    height: 64,
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      borderRadius: BorderRadius.circular(32),
                      boxShadow: [BoxShadow(color: AppColors.primary.withOpacity(0.4), blurRadius: 30, offset: const Offset(0, 10))],
                    ),
                    child: Center(
                      child: Text('Get Started', style: AppTypography.button(Colors.white).copyWith(fontSize: 18)),
                    ),
                  ),
                ).animate().fadeIn(duration: 600.ms, delay: 400.ms).slideY(begin: 0.2),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
