import 'package:flutter/material.dart';
import 'package:orange_ui/utils/color_res.dart';

class SocialIcon extends StatelessWidget {
  final String icon;
  final VoidCallback onSocialIconTap;
  final bool isVisible;

  const SocialIcon(
      {super.key,
      required this.isVisible,
      required this.icon,
      required this.onSocialIconTap});

  @override
  Widget build(BuildContext context) {
    return Visibility(
      visible: isVisible,
      child: InkWell(
        onTap: onSocialIconTap,
        child: Container(
          height: 29,
          width: 29,
          margin: const EdgeInsets.symmetric(horizontal: 2),
          padding: const EdgeInsets.all(4),
          decoration: const BoxDecoration(
            shape: BoxShape.circle,
            color: ColorRes.white,
          ),
          child: Image.asset(icon),
        ),
      ),
    );
  }
}
