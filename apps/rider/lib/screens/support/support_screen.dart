import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:ore_core/ore_core.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/router/app_router.dart';
import '../../data/auth/rider_api_client_provider.dart';

class RiderSupportScreen extends ConsumerStatefulWidget {
  const RiderSupportScreen({super.key});

  @override
  ConsumerState<RiderSupportScreen> createState() => _RiderSupportScreenState();
}

class _RiderSupportScreenState extends ConsumerState<RiderSupportScreen> {
  OreSupportContact _contact = OreSupportContact.empty;

  @override
  void initState() {
    super.initState();
    _loadContact();
  }

  Future<void> _loadContact() async {
    // Real provisioned line + whether in-app VoIP is live. Never a fake number.
    final contact = await OreCommsClient(ref.read(riderApiClientProvider)).supportContact();
    if (mounted) setState(() => _contact = contact);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Help & support', style: AppTypography.h2())),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(gradient: LinearGradient(colors: [AppColors.info.withOpacity(0.15), AppColors.info.withOpacity(0.05)]), borderRadius: BorderRadius.circular(16)),
          child: Row(children: [
            const Icon(LucideIcons.circleHelp, color: AppColors.info, size: 30),
            const SizedBox(width: 12),
            Expanded(child: Text('How can we help you today?', style: AppTypography.h3())),
          ]),
        ),
        const SizedBox(height: 20),
        Text('Quick help', style: AppTypography.h3()),
        const SizedBox(height: 10),
        _contactTile(
          LucideIcons.messageCircle,
          'Message Ore Support',
          'In-app thread — a teammate replies. Not a bot.',
          () => context.push(RiderRoutes.supportChat),
        ),
        if (_contact.appCallingEnabled)
          _contactTile(
            LucideIcons.phoneCall,
            'Call support in-app',
            'Free internet call — rings the Ore support team.',
            () => OreVoiceCallPage.openSupport(
              context,
              client: ref.read(riderApiClientProvider),
              topic: 'Rider support',
            ),
          ),
        if (_contact.phone != null)
          _contactTile(
            LucideIcons.phone,
            'Call support',
            _contact.phone!,
            () => _launch('tel:${_contact.phone}'),
          ),
        _contactTile(LucideIcons.mail, 'Email', 'riders@ore.app', () => _launch('mailto:riders@ore.app')),
        const SizedBox(height: 20),
        Text('Frequently asked', style: AppTypography.h3()),
        const SizedBox(height: 10),
        _faq('How do I get paid?', 'Earnings accrue per trip. Withdraw anytime to MoMo or bank.'),
        _faq('What if a customer cancels?', 'If the customer cancels before pickup, the trip is released and you become available for the next offer. After pickup, customers cannot cancel in the app.'),
        _faq('How do I release a trip?', 'On the delivery map, tap the X before you pick up the order. Dispatch will offer it to another rider. You cannot release after pickup.'),
        _faq('Does Ore track me when the screen is off?', 'Yes, only while you are online or on a trip. Android shows a persistent location notification. iOS shows the location arrow. This uses extra battery. Tracking stops when you go offline or force-close the app. Ore does not request “always” background location.'),
        _faq('Why do I need notification permission?', 'Android needs it to show the location notification. Offer and order alerts also use it when Firebase is configured on this device. Without the native Firebase files, push will not arrive — the in-app offer poll still runs while the app is open.'),
        _faq('When is peak hour pay?', 'If a funded Rider incentive is active, it will be shown in the app with its amount and validity window. Hotspots alone do not guarantee extra pay.'),
        _faq('How do I report an accident?', 'Use the SOS button — it alerts our safety team immediately.'),
        _faq('My bike broke down mid-trip?', 'Before pickup, tap the X on the delivery map to return the order to dispatch. After pickup, release is not available. Use the SOS button if you are in danger, or call or email Ore support from this screen.'),
        _faq('How do in-app calls work?', 'Tap Call on an order to reach the customer over the internet. If your connection is weak, the app offers a regular network call to their number instead — one tap opens your dialer.'),
      ]),
    );
  }

  Widget _contactTile(IconData i, String t, String sub, VoidCallback onTap) => AnimatedPress(
    onTap: onTap,
    child: Container(margin: const EdgeInsets.only(bottom: 8), padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14)), child: Row(children: [
      Icon(i, color: AppColors.primary),
      const SizedBox(width: 12),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(t, style: AppTypography.body().copyWith(fontWeight: FontWeight.w700)),
        Text(sub, style: AppTypography.caption()),
      ])),
      const Icon(LucideIcons.chevronRight, color: AppColors.textMuted, size: 18),
    ])),
  );

  Widget _faq(String q, String a) => Container(
    margin: const EdgeInsets.only(bottom: 8),
    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14)),
    child: ExpansionTile(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      title: Text(q, style: AppTypography.body().copyWith(fontWeight: FontWeight.w700)),
      childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
      children: [Text(a, style: AppTypography.body())],
    ),
  );

  Future<void> _launch(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }
}
