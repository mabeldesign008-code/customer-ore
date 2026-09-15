import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ore_core/ore_core.dart';

import '../core/ui/toast_x.dart';
import '../providers/customer_auth_provider.dart';
import '../providers/theme_provider.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});
  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  bool _pushNotifs = true;
  bool _emailNotifs = false;
  bool _smsNotifs = true;
  bool _location = true;

  @override
  Widget build(BuildContext context) {
    final sections = <_Section>[
      _Section('Notifications', [
        _toggle('Push notifications', 'Order updates & promotions', _pushNotifs,
            (v) => setState(() => _pushNotifs = v), Icons.notifications_outlined),
        _toggle('Email receipts', 'Get receipts by email', _emailNotifs,
            (v) => setState(() => _emailNotifs = v), Icons.mail_outline_rounded),
        _toggle('SMS alerts', 'Delivery SMS updates', _smsNotifs,
            (v) => setState(() => _smsNotifs = v), Icons.chat_bubble_outline_rounded),
      ]),
      _Section('Privacy & Location', [
        _toggle('Location services', 'Used for delivery accuracy', _location,
            (v) => setState(() => _location = v), Icons.my_location_rounded),
        _toggle(
          'Dark mode',
          _darkModeSubtitle(ref.watch(themeModeProvider)),
          _isDark(ref.watch(themeModeProvider)),
          (v) {
            HapticFeedback.selectionClick();
            ref.read(themeModeProvider.notifier).setTheme(v ? ThemeMode.dark : ThemeMode.light);
          },
          Icons.dark_mode_outlined,
        ),
      ]),
      _Section('Account', [
        _link('Personal info', Icons.person_rounded,
            () => context.push('/profile/edit')),
        _link('Payment methods', Icons.credit_card_rounded,
            () => context.push('/payments')),
        _link('Saved addresses', Icons.location_on_rounded,
            () => context.push('/addresses')),
        _link('Security & PIN', Icons.lock_outline_rounded,
            () => context.showToast('Customer PIN management is not exposed by the current Auth backend.', type: ToastType.info)),
      ]),
      _Section('Support & About', [
        _link('Help & support', Icons.headset_mic_rounded,
            () => context.push('/support')),
        _link('Terms of service', Icons.description_outlined,
            () => context.showToast('Opening terms…', type: ToastType.info)),
        _link('Privacy policy', Icons.shield_outlined,
            () => context.showToast('Opening policy…', type: ToastType.info)),
        _link('Rate Ore', Icons.star_rounded,
            () => context.showToast('Thanks for rating us!', type: ToastType.success)),
      ]),
    ];

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(8, 8, 16, 8),
            child: Row(children: [
              IconButton(tooltip: 'Action', 
                icon: const Icon(Icons.arrow_back_ios_new_rounded),
                onPressed: () => context.pop(),
              ),
              Expanded(child: Text('Settings', style: AppTypography.h3())),
            ]),
          ),
          Expanded(
            child: ListView(
              physics: const BouncingScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
              children: [
                for (var s = 0; s < sections.length; s++) ...[
                  _section(sections[s].label)
                      .animate(delay: Duration(milliseconds: 40 * s))
                      .fadeIn()
                      .slideX(begin: 0.1),
                  for (var i = 0; i < sections[s].items.length; i++)
                    sections[s].items[i]
                        .animate(
                            delay: Duration(milliseconds: 50 * (s * 5 + i)))
                        .fadeIn()
                        .slideY(begin: 0.1),
                  const SizedBox(height: 20),
                ],
                OreButton(
                  label: 'Sign out',
                  icon: Icons.logout_rounded,
                  variant: OreButtonVariant.danger,
                  onPressed: () async {
                    HapticFeedback.heavyImpact();
                    await ref.read(customerAuthProvider.notifier).logout();
                    if (context.mounted) context.go('/welcome');
                  },
                ).animate().fadeIn(delay: 400.ms).slideY(begin: 0.1),
                const SizedBox(height: 20),
                Center(
                  child: Text('Ore v1.0.0',
                      style: AppTypography.caption(AppColors.textMuted)),
                ),
              ],
            ),
          ),
        ]),
      ),
    );
  }

  Widget _section(String label) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Text(label,
            style: AppTypography.caption(AppColors.textSecondary)
                .copyWith(fontSize: 12, letterSpacing: 1, fontWeight: FontWeight.w800)),
      );

  Widget _toggle(String title, String sub, bool val,
      ValueChanged<bool> onChanged, IconData icon) {
    return OreCard(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(children: [
        Container(
          width: 38,
          height: 38,
          decoration: BoxDecoration(
            color: AppColors.primary.withOpacity(0.1),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, size: 18, color: AppColors.primary),
        ),
        const SizedBox(width: 14),
        Expanded(
            child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
              Text(title,
                  style:
                      AppTypography.bodyLg().copyWith(fontWeight: FontWeight.w600)),
              Text(sub, style: AppTypography.caption()),
            ])),
        Switch(
          value: val,
          onChanged: (v) {
            HapticFeedback.selectionClick();
            onChanged(v);
          },
          activeColor: AppColors.primary,
        ),
      ]),
    );
  }

  Widget _link(String title, IconData icon, VoidCallback onTap) {
    return OreCard(
      onTap: onTap,
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(children: [
        Icon(icon, size: 20, color: AppColors.textSecondary),
        const SizedBox(width: 14),
        Expanded(
            child: Text(title,
                style:
                    AppTypography.body().copyWith(fontWeight: FontWeight.w600))),
        const Icon(Icons.chevron_right_rounded,
            size: 18, color: AppColors.textMuted),
      ]),
    );
  }
}

class _Section {
  final String label;
  final List<Widget> items;
  const _Section(this.label, this.items);
}

bool _isDark(ThemeMode mode) {
  switch (mode) {
    case ThemeMode.dark:
      return true;
    case ThemeMode.light:
      return false;
    case ThemeMode.system:
      // We treat "system" as off so the toggle is deterministic.
      return false;
  }
}

String _darkModeSubtitle(ThemeMode mode) {
  switch (mode) {
    case ThemeMode.dark:
      return 'Dark theme is on';
    case ThemeMode.light:
      return 'Light theme is on';
    case ThemeMode.system:
      return 'Follows system';
  }
}
