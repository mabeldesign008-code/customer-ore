import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:ore_core/ore_core.dart' hide AppColors;
import 'package:url_launcher/url_launcher.dart';

import '../../core/router/app_router.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../providers/auth/vendor_auth_provider.dart';

class HelpCenterScreen extends ConsumerStatefulWidget {
  const HelpCenterScreen({super.key});

  @override
  ConsumerState<HelpCenterScreen> createState() => _HelpCenterScreenState();
}

class _HelpCenterScreenState extends ConsumerState<HelpCenterScreen> {
  final TextEditingController _searchController = TextEditingController();
  OreSupportContact _contact = OreSupportContact.empty;

  @override
  void initState() {
    super.initState();
    _loadContact();
  }

  Future<void> _loadContact() async {
    // Real provisioned line + in-app VoIP availability. Never a fake number.
    final contact = await OreCommsClient(ref.read(vendorApiClientProvider)).supportContact();
    if (mounted) setState(() => _contact = contact);
  }

  Future<void> _callInApp() async {
    await OreVoiceCallPage.openSupport(
      context,
      client: ref.read(vendorApiClientProvider),
      topic: 'Vendor support',
    );
  }

  Future<void> _callPhone(String phone) async {
    final uri = Uri(scheme: 'tel', path: phone);
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  final List<Map<String, dynamic>> _categories = [
    {'icon': LucideIcons.shoppingBag, 'title': 'Order Issues', 'subtitle': 'Cancellations, delays, disputes'},
    {'icon': LucideIcons.creditCard, 'title': 'Payments & Wallet', 'subtitle': 'Settlements, refunds, payouts'},
    {'icon': LucideIcons.utensils, 'title': 'Menu Management', 'subtitle': 'Adding items, pricing, photos'},
    {'icon': LucideIcons.settings, 'title': 'Account & Settings', 'subtitle': 'Profile, documents, security'},
    {'icon': LucideIcons.barChart2, 'title': 'Analytics & Reports', 'subtitle': 'Sales data, performance metrics'},
    {'icon': LucideIcons.truck, 'title': 'Delivery & Zones', 'subtitle': 'Coverage area, delivery fees'},
  ];

  final List<Map<String, dynamic>> _faqs = [
    {'question': 'How do I update my menu prices?', 'category': 'Menu'},
    {'question': 'When do I receive my weekly settlement?', 'category': 'Payments'},
    {'question': 'How do I dispute an order cancellation?', 'category': 'Orders'},
    {'question': 'How can I expand my delivery zone?', 'category': 'Delivery'},
    {'question': 'Why was my account temporarily suspended?', 'category': 'Account'},
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 1,
        shadowColor: AppColors.border,
        leading: IconButton(tooltip: 'Action', 
          icon: const Icon(LucideIcons.arrowLeft, size: 20, color: AppColors.textPrimary),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text('Help Center', style: AppTextStyles.heading2.copyWith(fontSize: 18)),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header with Search
            Container(
              width: double.infinity,
              color: AppColors.primary.withOpacity(0.05),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('How can we help?', style: AppTextStyles.heading2.copyWith(fontSize: 18)),
                  const SizedBox(height: 4),
                  Text('Search our knowledge base or browse categories.',
                      style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary)),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4, offset: const Offset(0, 2))],
                    ),
                    child: Row(
                      children: [
                        const Icon(LucideIcons.search, color: AppColors.textSecondary, size: 18),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextField(
                            controller: _searchController,
                            style: AppTextStyles.bodyMedium,
                            decoration: InputDecoration.collapsed(
                              hintText: 'Search for articles, guides...',
                              hintStyle: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Quick Support CTA
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('QUICK SUPPORT', style: AppTextStyles.captionBold.copyWith(color: AppColors.textSecondary, letterSpacing: 0.7)),
                  const SizedBox(height: 12),
                  GridView.count(
                    crossAxisCount: 2,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    childAspectRatio: 2.0,
                    children: _categories.map((cat) => _categoryCard(cat)).toList(),
                  ),
                ],
              ),
            ),

            // Divider
            Container(height: 1, color: AppColors.border),

            // FAQs
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('FREQUENTLY ASKED', style: AppTextStyles.captionBold.copyWith(color: AppColors.textSecondary, letterSpacing: 0.7)),
                  const SizedBox(height: 12),
                  ..._faqs.map((faq) => _faqItem(faq)).toList(),
                ],
              ),
            ),

            // Call support (in-app VoIP first, provisioned PSTN line second)
            if (_contact.appCallingEnabled || _contact.phone != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                child: Row(children: [
                  if (_contact.appCallingEnabled)
                    Expanded(
                      child: SizedBox(
                        height: 56,
                        child: OutlinedButton.icon(
                          onPressed: _callInApp,
                          icon: const Icon(LucideIcons.phoneCall, size: 18),
                          label: const Text('Call in-app', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppColors.primary,
                            side: BorderSide(color: AppColors.primary.withOpacity(0.5)),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          ),
                        ),
                      ),
                    ),
                  if (_contact.appCallingEnabled && _contact.phone != null) const SizedBox(width: 12),
                  if (_contact.phone != null)
                    Expanded(
                      child: SizedBox(
                        height: 56,
                        child: OutlinedButton.icon(
                          onPressed: () => _callPhone(_contact.phone!),
                          icon: const Icon(LucideIcons.phone, size: 18),
                          label: const Text('Call line', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppColors.primary,
                            side: BorderSide(color: AppColors.primary.withOpacity(0.5)),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          ),
                        ),
                      ),
                    ),
                ]),
              ),

            // Live chat button
            Padding(
              padding: const EdgeInsets.all(16),
              child: SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton.icon(
                  onPressed: () => context.push(VendorRoutes.supportChat),
                  icon: const Icon(LucideIcons.messageCircle, size: 20),
                  label: const Text('Contact Support', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    elevation: 4,
                    shadowColor: AppColors.primary.withOpacity(0.4),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _categoryCard(Map<String, dynamic> cat) {
    return InkWell(
      onTap: () {
        context.push(VendorRoutes.supportChat);
      },
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
        ),
        child: Row(
          children: [
            Container(
              width: 40, height: 40,
              decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
              child: Icon(cat['icon'] as IconData, color: AppColors.primary, size: 20),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(cat['title'], style: AppTextStyles.subtitleMedium.copyWith(fontSize: 13)),
                  Text(cat['subtitle'], style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary, fontSize: 11), maxLines: 1, overflow: TextOverflow.ellipsis),
                ],
              ),
            ),
            const Icon(LucideIcons.chevronRight, size: 14, color: Color(0xFFCBD5E1)),
          ],
        ),
      ),
    );
  }

  Widget _faqItem(Map<String, dynamic> faq) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          const Icon(LucideIcons.helpCircle, size: 18, color: AppColors.primary),
          const SizedBox(width: 12),
          Expanded(child: Text(faq['question'], style: AppTextStyles.subtitleMedium.copyWith(fontSize: 14))),
          const Icon(LucideIcons.chevronRight, size: 16, color: Color(0xFFCBD5E1)),
        ],
      ),
    );
  }
}
