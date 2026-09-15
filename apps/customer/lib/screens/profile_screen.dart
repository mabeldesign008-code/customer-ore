import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../core/ui/iconly_compat.dart';
import 'package:ore_core/ore_core.dart';
import '../providers/customer_auth_provider.dart';
import '../providers/wallet_provider.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});
  @override ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  @override Widget build(BuildContext context) {
    final user = ref.watch(customerAuthProvider).user;
    final wallet = ref.watch(walletProvider);
    
    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        physics: const BouncingScrollPhysics(),
        slivers: [
          SliverAppBar(
            expandedHeight: 120,
            pinned: true,
            backgroundColor: AppColors.background,
            flexibleSpace: FlexibleSpaceBar(
              titlePadding: const EdgeInsets.only(left: 24, bottom: 16),
              title: Text('Profile', style: AppTypography.h1()),
            ),
          ),
          
          if (user == null)
            SliverFillRemaining(child: Center(child: CircularProgressIndicator()))
          else
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Column(
                  children: [
                    // Header Card
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(28),
                        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 24, offset: const Offset(0, 8))],
                      ),
                      child: Row(
                        children: [
                          const CircleAvatar(
                            radius: 36,
                            backgroundColor: Color(0xFFF1F5F9),
                            backgroundImage: AssetImage('assets/images/profile/default_avatar.png'),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(user.name ?? 'Customer', style: AppTypography.h2().copyWith(fontSize: 22)),
                                const SizedBox(height: 4),
                                Text(user.phone, style: AppTypography.body(AppColors.textSecondary)),
                              ],
                            ),
                          ),
                          AnimatedPress(
                            onTap: () => context.push('/profile/edit'),
                            child: Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(color: AppColors.surface, shape: BoxShape.circle),
                              child: const Icon(IconlyLight.edit, color: AppColors.primary, size: 20),
                            ),
                          ),
                        ],
                      ),
                    ).animate().fadeIn().slideY(begin: 0.1),
                    
                    const SizedBox(height: 24),
                    
                    // Wallet & Loyalty Row
                    Row(
                      children: [
                        Expanded(
                          child: _MetricCard(
                            icon: IconlyBold.wallet,
                            color: AppColors.primary,
                            title: 'Wallet Balance',
                            value: Formatters.money(wallet),
                            onTap: () => context.push('/wallet'),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: _MetricCard(
                            icon: IconlyBold.ticketStar,
                            color: AppColors.accent,
                            title: 'Reward Points',
                            value: '1,240 pts',
                            onTap: () {},
                          ),
                        ),
                      ],
                    ).animate().fadeIn(delay: 100.ms).slideY(begin: 0.1),
                    
                    const SizedBox(height: 32),
                    
                    // Menu Options
                    _MenuSection(title: 'My Account', items: [
                      _MenuItem(icon: IconlyLight.location, title: 'Saved Addresses', onTap: () => context.push('/addresses')),
                      _MenuItem(icon: IconlyLight.heart, title: 'Favourites', onTap: () => context.push('/favourites')),
                      _MenuItem(icon: IconlyLight.discount, title: 'Vouchers & Offers', onTap: () => context.push('/vouchers')),
                    ]).animate().fadeIn(delay: 200.ms).slideY(begin: 0.1),
                    
                    const SizedBox(height: 24),
                    
                    _MenuSection(title: 'General', items: [
                      _MenuItem(icon: IconlyLight.setting, title: 'Settings', onTap: () => context.push('/settings')),
                      _MenuItem(icon: IconlyLight.infoSquare, title: 'Help & Support', onTap: () => context.push('/support')),
                      _MenuItem(
                        icon: IconlyLight.logout,
                        title: 'Log Out',
                        color: AppColors.danger,
                        onTap: () {
                          Haptics.light();
                          ref.read(customerAuthProvider.notifier).logout();
                        },
                      ),
                    ]).animate().fadeIn(delay: 300.ms).slideY(begin: 0.1),
                    
                    const SizedBox(height: 140), // Spacer for bottom nav
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({required this.icon, required this.color, required this.title, required this.value, required this.onTap});
  final IconData icon;
  final Color color;
  final String title;
  final String value;
  final VoidCallback onTap;

  @override Widget build(BuildContext context) {
    return AnimatedPress(
      onTap: onTap,
      borderRadius: BorderRadius.circular(24),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: color.withOpacity(0.08),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: color.withOpacity(0.2)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color, size: 28),
            const SizedBox(height: 16),
            Text(title, style: AppTypography.bodySm(AppColors.textSecondary)),
            const SizedBox(height: 4),
            Text(value, style: AppTypography.h2().copyWith(fontSize: 18)),
          ],
        ),
      ),
    );
  }
}

class _MenuSection extends StatelessWidget {
  const _MenuSection({required this.title, required this.items});
  final String title;
  final List<_MenuItem> items;
  @override Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 8, bottom: 12),
          child: Text(title, style: AppTypography.h3()),
        ),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 20, offset: const Offset(0, 4))],
          ),
          child: Column(
            children: items.asMap().entries.map((e) {
              final isLast = e.key == items.length - 1;
              return Column(
                children: [
                  e.value,
                  if (!isLast) const Divider(height: 1, indent: 64, endIndent: 20),
                ],
              );
            }).toList(),
          ),
        ),
      ],
    );
  }
}

class _MenuItem extends StatelessWidget {
  const _MenuItem({required this.icon, required this.title, this.color = AppColors.textPrimary, required this.onTap});
  final IconData icon;
  final String title;
  final Color color;
  final VoidCallback onTap;
  @override Widget build(BuildContext context) {
    return ListTile(
      onTap: () { Haptics.selection(); onTap(); },
      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      leading: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(color: color == AppColors.danger ? color.withOpacity(0.1) : AppColors.surface, shape: BoxShape.circle),
        child: Icon(icon, color: color, size: 22),
      ),
      title: Text(title, style: AppTypography.bodyLg().copyWith(color: color, fontWeight: FontWeight.w600)),
      trailing: const Icon(IconlyLight.arrowRight2, color: AppColors.textMuted, size: 18),
    );
  }
}
