import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';
import '../motion/motion.dart';

/// Slide-up top-of-screen toast for feedback (success/error/info/warning).
class OreToast {
  OreToast._();

  static void show(
    BuildContext context, {
    required String message,
    ToastType type = ToastType.info,
    Duration duration = const Duration(seconds: 2),
  }) {
    final overlay = Overlay.of(context, rootOverlay: true);
    late OverlayEntry entry;
    entry = OverlayEntry(
      builder: (_) => _ToastWidget(
        message: message,
        type: type,
        onDismiss: () => entry.remove(),
        duration: duration,
      ),
    );
    overlay.insert(entry);
  }
}

enum ToastType { success, error, info, warning }

class _ToastWidget extends StatefulWidget {
  const _ToastWidget({
    required this.message,
    required this.type,
    required this.onDismiss,
    required this.duration,
  });

  final String message;
  final ToastType type;
  final VoidCallback onDismiss;
  final Duration duration;

  @override
  State<_ToastWidget> createState() => _ToastWidgetState();
}

class _ToastWidgetState extends State<_ToastWidget>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c;

  @override
  void initState() {
    super.initState();
    _c = AnimationController(vsync: this, duration: Motion.normal);
    _c.forward();
    Future.delayed(widget.duration, () {
      if (mounted) _c.reverse().then((_) => widget.onDismiss());
    });
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = switch (widget.type) {
      ToastType.success => AppColors.success,
      ToastType.error => AppColors.danger,
      ToastType.warning => AppColors.warning,
      ToastType.info => AppColors.info,
    };
    final icon = switch (widget.type) {
      ToastType.success => Icons.check_circle_outline_rounded,
      ToastType.error => Icons.error_outline_rounded,
      ToastType.warning => Icons.warning_amber_rounded,
      ToastType.info => Icons.info_outline_rounded,
    };
    final mq = MediaQuery.of(context);
    return Positioned(
      top: mq.padding.top + 8,
      left: 16,
      right: 16,
      child: SlideTransition(
        position: Tween<Offset>(begin: const Offset(0, -1.2), end: Offset.zero)
            .animate(CurvedAnimation(parent: _c, curve: Motion.spring)),
        child: FadeTransition(
          opacity: _c,
          child: Material(
            color: Colors.transparent,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.12),
                    blurRadius: 16,
                    offset: const Offset(0, 6),
                  )
                ],
                border: Border.all(color: c.withOpacity(0.3)),
              ),
              child: Row(children: [
                Icon(icon, color: c, size: 22),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(widget.message, style: AppTypography.body()),
                ),
              ]),
            ),
          ),
        ),
      ),
    );
  }
}
