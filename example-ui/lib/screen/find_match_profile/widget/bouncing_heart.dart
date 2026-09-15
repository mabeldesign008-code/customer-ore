import 'package:flutter/material.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/style_res.dart';

class BouncingHeart extends StatefulWidget {
  const BouncingHeart({super.key});

  @override
  State<BouncingHeart> createState() => _BouncingHeartState();
}

class _BouncingHeartState extends State<BouncingHeart>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    )..repeat(reverse: true); // repeat zoom in/out

    _scaleAnimation = Tween<double>(begin: 1.0, end: 1.1).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Positioned(
      bottom: 10,
      left: 0,
      right: 0,
      child: Container(
        height: 71,
        width: 71,
        decoration: const BoxDecoration(
          shape: BoxShape.circle,
          gradient: StyleRes.linearGradient,
        ),
        alignment: Alignment.center,
        child: ScaleTransition(
          scale: _scaleAnimation,
          child: Image.asset(
            AssetRes.icFillFav,
            color: ColorRes.white,
            width: 42,
            height: 42,
          ),
        ),
      ),
    );
  }
}
