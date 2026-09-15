import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';
import 'animated_press.dart';
import 'ore_button.dart';

/// Universal support escape hatch modal matching Section 0.6 of Ore Architecture Spec.
class OreSupportModal extends StatelessWidget {
  const OreSupportModal({super.key, this.title = 'Need assistance?', this.onOpenChat});

  final String title;
  /// When set, in-app Ore Support chat is the first action (chunk 3.4).
  final VoidCallback? onOpenChat;

  static void show(BuildContext context, {String title = 'Need assistance?', VoidCallback? onOpenChat}) {
    HapticFeedback.lightImpact();
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => OreSupportModal(title: title, onOpenChat: onOpenChat),
    );
  }

  Future<void> _launch(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 36),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Drag handle
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: AppColors.border,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.headset_mic_outlined, color: AppColors.primary, size: 22),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: AppTypography.h3()),
                    const SizedBox(height: 2),
                    Text(
                      'Our Cape Coast team is here to assist 24/7',
                      style: AppTypography.bodySmall(AppColors.textSecondary),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          if (onOpenChat != null) ...[
            _SupportTile(
              icon: Icons.chat_bubble_outline,
              title: 'Message Ore Support',
              subtitle: 'In-app thread — a teammate replies. Not a bot.',
              onTap: () {
                Navigator.of(context).pop();
                onOpenChat!();
              },
            ),
            const SizedBox(height: 10),
          ],
          _SupportTile(
            icon: Icons.phone_outlined,
            title: 'Call Helpline',
            subtitle: '+233 (0) 50 123 4567',
            onTap: () => _launch('tel:+233501234567'),
          ),
          const SizedBox(height: 10),
          _SupportTile(
            icon: Icons.chat_outlined,
            title: 'WhatsApp Support',
            subtitle: 'Instant messaging with an agent',
            onTap: () => _launch('https://wa.me/233501234567?text=Hi%20Ore%20Support'),
          ),
          const SizedBox(height: 10),
          _SupportTile(
            icon: Icons.mail_outline,
            title: 'Email Compliance / Support',
            subtitle: 'support@oredelivery.com',
            onTap: () => _launch('mailto:support@oredelivery.com'),
          ),
          const SizedBox(height: 24),
          OreButton.secondary(
            label: 'Close',
            onPressed: () => Navigator.of(context).pop(),
          ),
        ],
      ),
    );
  }
}

class _SupportTile extends StatelessWidget {
  const _SupportTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return AnimatedPress(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.background,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
        ),
        child: Row(
          children: [
            Icon(icon, color: AppColors.textPrimary, size: 20),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: AppTypography.button(AppColors.textPrimary)),
                  Text(subtitle, style: AppTypography.caption(AppColors.textSecondary)),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: AppColors.textSecondary, size: 18),
          ],
        ),
      ),
    );
  }
}
