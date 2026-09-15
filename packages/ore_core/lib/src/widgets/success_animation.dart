import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../motion/motion.dart';
import '../theme/app_colors.dart';

/// A self-contained "success" animation that draws a circular check with
/// scale-in + draw-on effects. No asset files required.
class SuccessAnimation extends StatefulWidget {
  final double size;
  final Color color;
  final Duration duration;
  final bool autoPlay;
  const SuccessAnimation({
    super.key,
    this.size = 120,
    this.color = AppColors.success,
    this.duration = const Duration(milliseconds: 900),
    this.autoPlay = true,
  });

  @override
  State<SuccessAnimation> createState() => _SuccessAnimationState();
}

class _SuccessAnimationState extends State<SuccessAnimation>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c;
  late final Animation<double> _ring;
  late final Animation<double> _check;

  @override
  void initState() {
    super.initState();
    _c = AnimationController(vsync: this, duration: widget.duration);
    _ring = CurvedAnimation(parent: _c, curve: const Interval(0, 0.55, curve: Motion.spring));
    _check = CurvedAnimation(parent: _c, curve: const Interval(0.5, 1, curve: Curves.easeOutCubic));
    if (widget.autoPlay) {
      Future.delayed(const Duration(milliseconds: 120), () {
        if (mounted) _c.forward();
      });
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: widget.size,
      height: widget.size,
      child: AnimatedBuilder(
        animation: _c,
        builder: (c, _) => CustomPaint(
          painter: _SuccessPainter(
            ringProgress: _ring.value,
            checkProgress: _check.value,
            color: widget.color,
          ),
        ),
      ),
    );
  }
}

class _SuccessPainter extends CustomPainter {
  final double ringProgress;
  final double checkProgress;
  final Color color;
  _SuccessPainter({required this.ringProgress, required this.checkProgress, required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2 - 4;

    // Ring fill
    final fillPaint = Paint()..color = color.withOpacity(0.12);
    canvas.drawCircle(center, radius, fillPaint);

    // Ring stroke
    final ringPaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 5
      ..strokeCap = StrokeCap.round;
    final sweep = 2 * 3.14159265 * ringProgress.clamp(0.0, 1.0);
    canvas.drawArc(Rect.fromCircle(center: center, radius: radius), -3.14159265 / 2, sweep, false, ringPaint);

    if (checkProgress <= 0) return;
    final path = Path();
    final p1 = Offset(size.width * 0.28, size.height * 0.52);
    final p2 = Offset(size.width * 0.45, size.height * 0.68);
    final p3 = Offset(size.width * 0.74, size.height * 0.36);
    final pathLen = (p2 - p1).distance + (p3 - p2).distance;
    final drawn = pathLen * checkProgress;
    final d1 = (p2 - p1).distance;
    if (drawn <= d1) {
      final t = drawn / d1;
      path.moveTo(p1.dx, p1.dy);
      path.lineTo(p1.dx + (p2.dx - p1.dx) * t, p1.dy + (p2.dy - p1.dy) * t);
    } else {
      path.moveTo(p1.dx, p1.dy);
      path.lineTo(p2.dx, p2.dy);
      final d2 = drawn - d1;
      final d2total = (p3 - p2).distance;
      final t = d2 / d2total;
      path.lineTo(p2.dx + (p3.dx - p2.dx) * t, p2.dy + (p3.dy - p2.dy) * t);
    }
    final checkPaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 5
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    canvas.drawPath(path, checkPaint);
  }

  @override
  bool shouldRepaint(covariant _SuccessPainter oldDelegate) =>
      oldDelegate.ringProgress != ringProgress ||
      oldDelegate.checkProgress != checkProgress ||
      oldDelegate.color != color;
}

/// Full-screen success overlay card — use after order-confirm, tip-paid,
/// delivery-complete etc.
class SuccessCelebration extends StatelessWidget {
  final String title;
  final String subtitle;
  final String ctaLabel;
  final VoidCallback onCta;
  const SuccessCelebration({
    super.key,
    required this.title,
    required this.subtitle,
    required this.ctaLabel,
    required this.onCta,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            const Spacer(),
            Stack(alignment: Alignment.center, children: [
              // Radiating bursts
              for (int i = 0; i < 8; i++)
                Transform.rotate(
                  angle: i * 0.785,
                  child: Container(
                    width: 4,
                    height: 140,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [AppColors.primary.withOpacity(0.6), Colors.transparent],
                      ),
                    ),
                  ),
                ).animate().scale(begin: const Offset(0, 0), end: const Offset(1, 1), duration: 600.ms, curve: Motion.spring).fadeIn(),
              const SuccessAnimation(size: 140),
            ]),
            const SizedBox(height: 36),
            Text(title, style: Theme.of(context).textTheme.displaySmall?.copyWith(fontWeight: FontWeight.w800, color: AppColors.textPrimary))
                .animate()
                .fadeIn(duration: Motion.medium)
                .slideY(begin: 0.25),
            const SizedBox(height: 10),
            Text(subtitle, textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: AppColors.textSecondary))
                .animate()
                .fadeIn(delay: 200.ms),
            const Spacer(),
            // Confetti dots
            SizedBox(
              height: 80,
              child: Row(mainAxisAlignment: MainAxisAlignment.spaceEvenly, children: [
                for (final c in [AppColors.primary, AppColors.accent, AppColors.success, AppColors.warning, AppColors.info, AppColors.danger])
                  _confetto(c, 8 + c.value % 10)
              ]),
            ),
            const SizedBox(height: 20),
            OreButtonReady(label: ctaLabel, onPressed: onCta),
          ]),
        ),
      ),
    );
  }

  Widget _confetto(Color c, double delaySec) => Container(
        width: 10,
        height: 14,
        decoration: BoxDecoration(color: c, borderRadius: BorderRadius.circular(2)),
      )
          .animate(delay: Duration(milliseconds: 200 + (delaySec * 60).toInt()))
          .slideY(begin: -4, end: 0, duration: 800.ms, curve: Curves.easeOutBack)
          .rotate(begin: -0.5, end: 0.2);
}

/// Re-exported ready button to avoid cyclic imports in this file.
class OreButtonReady extends StatelessWidget {
  final String label;
  final VoidCallback onPressed;
  const OreButtonReady({super.key, required this.label, required this.onPressed});
  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 54,
      child: ElevatedButton(
        onPressed: onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
        ),
        child: Text(label),
      ),
    );
  }
}
