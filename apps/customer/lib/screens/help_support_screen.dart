import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ore_core/ore_core.dart';
import 'package:url_launcher/url_launcher.dart';

import '../providers/customer_auth_provider.dart';


class HelpSupportScreen extends StatelessWidget {
  const HelpSupportScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final faqs = [
      (
        'How do I track my order?',
        'Go to the Orders tab and tap on any active order to see real-time tracking with rider location.',
      ),
      (
        'How do I cancel an order?',
        'Customer cancellation depends on the current order state. Open the order details screen and contact Ore support if the order cannot be cancelled from checkout.',
      ),
      (
        'How do refunds work?',
        'Delivered-order refund requests are reviewed through the Ledger dispute flow. The final decision and refund method are shown in Refund requests.'
      ),
      (
        'How do I become a rider?',
        'Visit ore.app/rider to sign up in minutes. Bring a valid ID and a smartphone.',
      ),
      (
        'What payment methods are accepted?',
        'Mobile Money and Card are prepaid through Paystack. Cash on Delivery is offered only when the checkout service and Vendor allow it.'
      ),
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
              Expanded(child: Text('Help & Support', style: AppTypography.h3())),
            ]),
          ),
          Expanded(
            child: ListView(
              physics: const BouncingScrollPhysics(
                  parent: AlwaysScrollableScrollPhysics()),
              padding: const EdgeInsets.all(20),
              children: [
                // Contact hero
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                        colors: [AppColors.primary, AppColors.primaryDark]),
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                          color: AppColors.primary.withOpacity(0.3),
                          blurRadius: 18,
                          offset: const Offset(0, 8))
                    ],
                  ),
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Need help?',
                            style: AppTypography.h2(Colors.white)),
                        const SizedBox(height: 6),
                        Text('Message, call in-app, or email Ore Support',
                            style: AppTypography.body(
                                const Color(0xB3FFFFFF))),
                        const SizedBox(height: 20),
                        SizedBox(
                          width: double.infinity,
                          child: _contactBtn(
                            Icons.chat_outlined,
                            'Message Ore Support',
                            () {
                              HapticFeedback.mediumImpact();
                              context.push('/chat?support=1');
                            },
                          ),
                        ),
                        const SizedBox(height: 12),
                        Row(children: [
                          Expanded(
                              child: _contactBtn(
                                  Icons.warning_amber_rounded,
                                  'Issues',
                                  () => context.push('/disputes'))),
                          const SizedBox(width: 12),
                          const Expanded(child: _SupportCallBtn()),
                          const SizedBox(width: 12),
                          Expanded(
                              child: _contactBtn(Icons.mail_outline_rounded, 'Email',
                                  () {
                            HapticFeedback.mediumImpact();
                            launchUrl(Uri.parse('mailto:support@ore.app'));
                          })),
                        ]),
                      ]),
                ).animate().fadeIn().slideY(begin: 0.1, curve: Motion.spring),
                const SizedBox(height: 24),
                Text('Quick help', style: AppTypography.h3())
                    .animate()
                    .fadeIn(delay: 100.ms)
                    .slideY(begin: 0.1),
                const SizedBox(height: 12),
                for (var i = 0; i < faqs.length; i++)
                  _faqTile(context, faqs[i].$1, faqs[i].$2, i),
                const SizedBox(height: 24),
                Text('Emergency', style: AppTypography.h3())
                    .animate()
                    .fadeIn(delay: 250.ms),
                const SizedBox(height: 12),
                OreCard(
                  onTap: () {
                    HapticFeedback.mediumImpact();
                    launchUrl(Uri.parse('tel:112'));
                  },
                  color: AppColors.danger.withOpacity(0.06),
                  child: Row(children: [
                    Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                            color: AppColors.danger,
                            borderRadius: BorderRadius.circular(14)),
                        child: const Icon(Icons.support_rounded,
                            color: Colors.white)),
                    const SizedBox(width: 14),
                    Expanded(
                        child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                          Text('Call emergency services',
                              style: AppTypography.bodyLg()
                                  .copyWith(fontWeight: FontWeight.w700)),
                          Text('Safety emergency while delivering',
                              style: AppTypography.caption()),
                        ])),
                    const Icon(Icons.chevron_right_rounded,
                        color: AppColors.danger),
                  ]),
                ).animate().fadeIn(delay: 300.ms).slideY(begin: 0.1),
                const SizedBox(height: 20),
              ],
            ),
          ),
        ]),
      ),
    );
  }

  Widget _contactBtn(IconData i, String label, VoidCallback onTap) {
    return AnimatedPress(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.2),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Colors.white.withOpacity(0.25))),
        child: Column(children: [
          Icon(i, color: Colors.white, size: 22),
          const SizedBox(height: 6),
          Text(label,
              style: AppTypography.caption(Colors.white)
                  .copyWith(fontWeight: FontWeight.w700, fontSize: 11)),
        ]),
      ),
    );
  }

  Widget _faqTile(BuildContext context, String q, String a, int i) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          tilePadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          collapsedShape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          backgroundColor: Colors.white,
          collapsedBackgroundColor: Colors.white,
          leading:
              const Icon(Icons.help_outline_rounded, color: AppColors.primary, size: 20),
          title: Text(q,
              style: AppTypography.body().copyWith(fontWeight: FontWeight.w600)),
          childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
          children: [
            Text(a, style: AppTypography.bodySm()),
          ],
        ),
      ),
    ).animate(delay: Duration(milliseconds: 100 + (i * 60))).fadeIn().slideX(begin: 0.08);
  }
}

/// Support call button backed by `GET /comms/support/contact` — never a
/// hardcoded number. In-app VoIP first, PSTN second, chat as last resort.
class _SupportCallBtn extends ConsumerStatefulWidget {
  const _SupportCallBtn();

  @override
  ConsumerState<_SupportCallBtn> createState() => _SupportCallBtnState();
}

class _SupportCallBtnState extends ConsumerState<_SupportCallBtn> {
  OreSupportContact _contact = OreSupportContact.empty;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final contact =
        await OreCommsClient(ref.read(customerApiClientProvider)).supportContact();
    if (mounted) setState(() => _contact = contact);
  }

  Future<void> _tap() async {
    HapticFeedback.mediumImpact();
    if (_contact.appCallingEnabled) {
      await OreVoiceCallPage.openSupport(
        context,
        client: ref.read(customerApiClientProvider),
        topic: 'Customer support',
      );
      return;
    }
    final phone = _contact.phone;
    if (phone != null) {
      final uri = Uri(scheme: 'tel', path: phone);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri);
        return;
      }
    }
    if (mounted) context.push('/chat?support=1');
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedPress(
      onTap: () {
        _tap();
      },
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.2),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Colors.white.withOpacity(0.25))),
        child: Column(children: [
          const Icon(Icons.phone_rounded, color: Colors.white, size: 22),
          const SizedBox(height: 6),
          Text(_contact.appCallingEnabled ? 'Call app' : 'Call',
              style: AppTypography.caption(Colors.white)
                  .copyWith(fontWeight: FontWeight.w700, fontSize: 11)),
        ]),
      ),
    );
  }
}
