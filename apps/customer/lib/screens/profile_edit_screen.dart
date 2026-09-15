import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ore_core/ore_core.dart';

import '../core/ui/iconly_compat.dart';

import '../core/ui/toast_x.dart';
import '../providers/customer_auth_provider.dart';

class ProfileEditScreen extends ConsumerStatefulWidget {
  const ProfileEditScreen({super.key});
  @override
  ConsumerState<ProfileEditScreen> createState() => _ProfileEditScreenState();
}

class _ProfileEditScreenState extends ConsumerState<ProfileEditScreen> {
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final user = ref.read(customerAuthProvider).user;
    _nameCtrl.text = user?.name ?? '';
    _emailCtrl.text = user?.email ?? '';
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    HapticFeedback.mediumImpact();
    try {
      await ref.read(customerAuthProvider.notifier).updateProfile(
            name: _nameCtrl.text.trim(),
            email: _emailCtrl.text.trim().isEmpty ? null : _emailCtrl.text.trim(),
          );
      if (!mounted) return;
      context.showToast('Profile updated', type: ToastType.success);
      context.pop();
    } catch (e) {
      if (!mounted) return;
      context.showToast(e.toString().replaceFirst('Exception: ', ''), type: ToastType.error);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(customerAuthProvider).user;
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        leading: IconButton(icon: const Icon(Icons.arrow_back_ios_new_rounded), onPressed: () => context.pop()),
        title: Text('Edit Profile', style: AppTypography.h3()),
      ),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
            padding: const EdgeInsets.all(20),
            children: [
              Center(
                child: Stack(children: [
                  const CircleAvatar(
                    radius: 48,
                    backgroundImage: AssetImage('assets/images/profile/default_avatar.png'),
                  ),
                  Positioned(
                    right: 0, bottom: 0,
                    child: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle),
                      child: const Icon(Icons.camera_alt_rounded, color: Colors.white, size: 16),
                    ),
                  ),
                ]).animate().scale(begin: const Offset(0.8, 0.8), curve: Curves.easeOutBack),
              ),
              const SizedBox(height: 28),
              if (user?.phone != null) ...[
                OreCard(
                  child: Row(children: [
                    const Icon(IconlyBold.call, color: AppColors.textSecondary),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text('Phone number', style: AppTypography.caption()),
                        Text(user!.phone!, style: AppTypography.bodyLg().copyWith(fontWeight: FontWeight.w700)),
                      ]),
                    ),
                    Text('Verified', style: AppTypography.caption(AppColors.success)),
                  ]),
                ),
                const SizedBox(height: 20),
              ],
              Text('Full name', style: AppTypography.caption()),
              const SizedBox(height: 6),
              OreInput(
                controller: _nameCtrl,
                prefixIcon: IconlyBold.profile,
                hintText: 'Your full name',
                textCapitalization: TextCapitalization.words,
                autoFocus: true,
              ),
              const SizedBox(height: 16),
              Text('Email (optional)', style: AppTypography.caption()),
              const SizedBox(height: 6),
              OreInput(
                controller: _emailCtrl,
                prefixIcon: IconlyBold.message,
                hintText: 'you@example.com',
                keyboardType: TextInputType.emailAddress,
              ),
              const SizedBox(height: 32),
              OreButton(
                label: 'Save changes',
                icon: IconlyBold.tickSquare,
                isLoading: _saving,
                onPressed: _saving ? null : _save,
              ).animate().fadeIn(delay: 150.ms).slideY(begin: 0.2),
            ],
          ),
        ),
      ),
    );
  }
}
