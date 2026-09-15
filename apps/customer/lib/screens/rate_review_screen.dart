import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_rating_bar/flutter_rating_bar.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ore_core/ore_core.dart';

import '../core/ui/toast_x.dart';
import '../providers/customer_auth_provider.dart';

class RateReviewScreen extends ConsumerStatefulWidget {
  const RateReviewScreen({super.key, required this.orderId});
  final String orderId;
  @override
  ConsumerState<RateReviewScreen> createState() => _RateReviewScreenState();
}

class _RateReviewScreenState extends ConsumerState<RateReviewScreen> {
  double _rating = 5;
  final _tags = [
    'Fast delivery',
    'Great food',
    'Friendly rider',
    'Hot & fresh',
    'Wrong items',
    'Late delivery',
  ];
  final _selectedTags = <String>{};
  final _note = TextEditingController();
  bool _submitting = false;
  bool _submitted = false;

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_submitting) return;
    setState(() => _submitting = true);
    HapticFeedback.mediumImpact();
    try {
      final comment = [
        ..._selectedTags,
        if (_note.text.trim().isNotEmpty) _note.text.trim(),
      ].join(' · ');
      await ref.read(customerReviewRepositoryProvider).submit(
            orderId: widget.orderId,
            rating: _rating.round(),
            comment: comment.isEmpty ? null : comment,
          );
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _submitted = true;
      });
      Haptics.success();
      await Future<void>.delayed(const Duration(milliseconds: 900));
      if (!mounted) return;
      context.go('/orders');
      context.showToast('Thanks for your feedback!', type: ToastType.success);
    } catch (error) {
      if (!mounted) return;
      setState(() => _submitting = false);
      context.showToast(error.toString(), type: ToastType.error);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_submitted) {
      return Scaffold(
        backgroundColor: AppColors.background,
        body: SafeArea(
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.check_circle_outline_rounded,
                        color: AppColors.success, size: 88)
                    .animate()
                    .scale(
                        begin: const Offset(0.5, 0.5),
                        duration: 500.ms,
                        curve: Curves.elasticOut),
                const SizedBox(height: 20),
                Text('Thanks!', style: AppTypography.h1().copyWith(fontSize: 28)),
                const SizedBox(height: 8),
                Text(
                  'Your feedback makes Ore better.',
                  style: AppTypography.body(AppColors.textSecondary),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.all(24),
          child: Column(children: [
            Row(children: [
              IconButton(tooltip: 'Action', 
                  onPressed: () => context.pop(),
                  icon: const Icon(Icons.close_rounded)),
              Expanded(
                  child: Text('Rate your order',
                      style: AppTypography.h3(),
                      textAlign: TextAlign.center)),
              const SizedBox(width: 48),
            ]),
            const SizedBox(height: 12),
            Container(
              width: 88,
              height: 88,
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.inventory_rounded,
                  color: AppColors.primary, size: 38),
            )
                .animate()
                .scale(
                    duration: Motion.medium,
                    curve: Motion.spring,
                    begin: const Offset(0.4, 0.4)),
            const SizedBox(height: 20),
            Text('How was your order?',
                style: AppTypography.h1().copyWith(fontSize: 24)),
            const SizedBox(height: 8),
            Text('Your feedback helps us improve',
                style: AppTypography.body(AppColors.textSecondary)),
            const SizedBox(height: 28),
            RatingBar.builder(
              initialRating: _rating,
              minRating: 1,
              direction: Axis.horizontal,
              itemCount: 5,
              itemSize: 48,
              itemPadding: const EdgeInsets.symmetric(horizontal: 6),
              unratedColor: AppColors.border,
              glow: false,
              onRatingUpdate: (v) {
                HapticFeedback.selectionClick();
                setState(() => _rating = v);
              },
              itemBuilder: (c, _) => const Icon(Icons.star_rounded,
                  color: AppColors.accent),
            ).animate().fadeIn(delay: 150.ms).scale(curve: Motion.spring),
            const SizedBox(height: 32),
            Align(
                alignment: Alignment.centerLeft,
                child:
                    Text('What went well?', style: AppTypography.h3())),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (var i = 0; i < _tags.length; i++)
                  _tagChip(_tags[i])
                      .animate(delay: Duration(milliseconds: 50 * i))
                      .fadeIn()
                      .scale(
                        begin: const Offset(0.9, 0.9),
                        curve: Curves.easeOutBack,
                      ),
              ],
            ),
            const SizedBox(height: 28),
            Align(
                alignment: Alignment.centerLeft,
                child: Text('Add a note (optional)',
                    style: AppTypography.h3())),
            const SizedBox(height: 10),
            TextField(
              controller: _note,
              maxLines: 4,
              decoration: InputDecoration(
                hintText: 'Tell us about your experience...',
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: BorderSide.none),
              ),
            ),
            const SizedBox(height: 32),
            OreButton(
              label: _submitting ? 'Submitting…' : 'Submit review',
              icon: Icons.check_rounded,
              isLoading: _submitting,
              onPressed: _submit,
            )
                .animate(delay: 300.ms)
                .fadeIn()
                .slideY(begin: 0.1),
            const SizedBox(height: 16),
            TextButton(
              onPressed: () => context.pop(),
              child: Text('Skip',
                  style: AppTypography.body(AppColors.textSecondary)),
            ),
          ]),
        ),
      ),
    );
  }

  Widget _tagChip(String t) {
    final sel = _selectedTags.contains(t);
    return OreChip(
      label: t,
      selected: sel,
      onTap: () {
        HapticFeedback.selectionClick();
        setState(() {
          if (sel) {
            _selectedTags.remove(t);
          } else {
            _selectedTags.add(t);
          }
        });
      },
    );
  }
}
