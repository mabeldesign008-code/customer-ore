import 'package:flutter/material.dart';

class FadeAnimation extends StatefulWidget {
  final int delay;

  const FadeAnimation({super.key, required this.delay});

  @override
  State<FadeAnimation> createState() => _FadeAnimationState();
}

/// AnimationControllers can be created with `vsync: this` because of TickerProviderStateMixin.
class _FadeAnimationState extends State<FadeAnimation>
    with TickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    duration: Duration(seconds: widget.delay),
    vsync: this,
  )..repeat(reverse: true);
  late final Animation<double> _animation = CurvedAnimation(
    parent: _controller,
    curve: Curves.easeIn,
  );

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      child: FadeTransition(
        opacity: _animation,
        child: const Padding(padding: EdgeInsets.all(8), child: FlutterLogo()),
      ),
    );
  }
}
