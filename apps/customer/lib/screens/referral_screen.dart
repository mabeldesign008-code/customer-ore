import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ore_core/ore_core.dart';

import '../core/ui/toast_x.dart';
import '../providers/customer_auth_provider.dart';
import '../data/referral/customer_referral_repository.dart';

class ReferralScreen extends ConsumerStatefulWidget {
  const ReferralScreen({super.key});

  @override
  ConsumerState<ReferralScreen> createState() => _ReferralScreenState();
}

class _ReferralScreenState extends ConsumerState<ReferralScreen> {
  final _code = TextEditingController();
  late final TextEditingController _phone;
  bool _claiming = false;

  @override
  void initState() {
    super.initState();
    _phone = TextEditingController(
      text: ref.read(customerAuthProvider).user?.phone ?? '',
    );
  }

  @override
  void dispose() {
    _code.dispose();
    _phone.dispose();
    super.dispose();
  }

  Future<void> _refresh() async {
    ref.invalidate(customerReferralStatsProvider);
    ref.invalidate(customerReferralsProvider);
    await Future.wait([
      ref.read(customerReferralStatsProvider.future),
      ref.read(customerReferralsProvider.future),
    ]);
  }

  Future<void> _copyCode(String code) async {
    await Clipboard.setData(ClipboardData(text: code));
    if (mounted) context.showToast('Referral code copied.', type: ToastType.success);
  }

  Future<void> _claim() async {
    if (_claiming) return;
    final code = _code.text.trim();
    final phone = _phone.text.trim();
    if (code.length < 4 || phone.isEmpty) {
      context.showToast('Enter a referral code and Ghana phone number.', type: ToastType.error);
      return;
    }
    setState(() => _claiming = true);
    try {
      await ref.read(customerReferralRepositoryProvider).claim(code: code, phone: phone);
      ref.invalidate(customerReferralStatsProvider);
      ref.invalidate(customerReferralsProvider);
      _code.clear();
      if (mounted) context.showToast('Referral claimed successfully.', type: ToastType.success);
    } catch (error) {
      if (mounted) context.showToast(error.toString(), type: ToastType.error);
    } finally {
      if (mounted) setState(() => _claiming = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final stats = ref.watch(customerReferralStatsProvider).value;
    final referrals = ref.watch(customerReferralsProvider).value ?? const <CustomerReferral>[];
    final statsState = ref.watch(customerReferralStatsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _refresh,
          color: AppColors.primary,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
            children: [
              Row(
                children: [
                  IconButton(tooltip: 'Action', onPressed: () => context.pop(), icon: const Icon(Icons.arrow_back_ios_new_rounded)),
                  Expanded(child: Text('Invite friends', style: AppTypography.h3())),
                ],
              ),
              const SizedBox(height: 12),
              OreCard(
                color: AppColors.primary,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.card_giftcard_rounded, color: Colors.white, size: 32),
                    const SizedBox(height: 12),
                    Text('Share Ore with a friend', style: AppTypography.h2(Colors.white)),
                    const SizedBox(height: 6),
                    Text('Your friend receives the referral reward after their first qualifying delivered order.', style: AppTypography.bodySm(Colors.white70)),
                    const SizedBox(height: 18),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(color: Colors.white.withOpacity(0.14), borderRadius: BorderRadius.circular(14)),
                      child: Row(
                        children: [
                          Expanded(child: Text(stats?.code ?? 'Loading code…', style: AppTypography.h3(Colors.white))),
                          IconButton(tooltip: 'Action', 
                            onPressed: stats == null ? null : () => _copyCode(stats.code),
                            icon: const Icon(Icons.content_copy_rounded, color: Colors.white),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              if (statsState.hasError)
                Text('Referral stats are temporarily unavailable.', style: AppTypography.bodySm(AppColors.danger)),
              Row(
                children: [
                  Expanded(child: _stat('Pending', '${stats?.pending ?? 0}', AppColors.warning)),
                  const SizedBox(width: 10),
                  Expanded(child: _stat('Credited', '${stats?.credited ?? 0}', AppColors.success)),
                  const SizedBox(width: 10),
                  Expanded(child: _stat('Earned', Formatters.money((stats?.earnedPesewas ?? 0) / 100), AppColors.primary)),
                ],
              ),
              const SizedBox(height: 24),
              Text('Claim a referral', style: AppTypography.h2()),
              const SizedBox(height: 8),
              Text('If someone invited you, enter their code and the phone used for the referral.', style: AppTypography.bodySm()),
              const SizedBox(height: 12),
              TextField(
                controller: _code,
                textCapitalization: TextCapitalization.characters,
                decoration: const InputDecoration(labelText: 'Referral code', prefixIcon: Icon(Icons.local_activity_outlined)),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _phone,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(labelText: 'Ghana phone number', prefixIcon: Icon(Icons.phone_rounded)),
              ),
              const SizedBox(height: 12),
              OreButton(label: _claiming ? 'Claiming…' : 'Claim code', icon: Icons.check_rounded, isLoading: _claiming, onPressed: _claim),
              const SizedBox(height: 24),
              Text('Referral activity', style: AppTypography.h2()),
              const SizedBox(height: 10),
              if (referrals.isEmpty)
                Text('No referral activity yet.', style: AppTypography.bodySm())
              else
                ...referrals.map(
                  (referral) => OreCard(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.all(14),
                    child: Row(
                      children: [
                        const Icon(Icons.person_add_rounded, color: AppColors.primary),
                        const SizedBox(width: 10),
                        Expanded(child: Text(referral.refereePhone.isEmpty ? referral.code : referral.refereePhone, style: AppTypography.body())),
                        Text(referral.status, style: AppTypography.caption(_statusColor(referral.status))),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _stat(String label, String value, Color color) => OreCard(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: AppTypography.caption()),
            const SizedBox(height: 4),
            Text(value, style: AppTypography.bodyLg(color).copyWith(fontWeight: FontWeight.w800), maxLines: 1, overflow: TextOverflow.ellipsis),
          ],
        ),
      );

  Color _statusColor(String status) {
    switch (status.toUpperCase()) {
      case 'CREDITED':
        return AppColors.success;
      case 'BLOCKED':
        return AppColors.danger;
      default:
        return AppColors.warning;
    }
  }
}
