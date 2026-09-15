import 'package:flutter/material.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';

class RandomSearchTopBarArea extends StatelessWidget {
  final VoidCallback onBackBtnTap;

  const RandomSearchTopBarArea({
    super.key,
    required this.onBackBtnTap,
  });

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
        child: Stack(
          alignment: Alignment.centerLeft,
          children: [
            InkWell(
              onTap: onBackBtnTap,
              borderRadius: BorderRadius.circular(30),
              child: Container(
                height: 37,
                width: 37,
                padding: const EdgeInsets.all(5),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: ColorRes.themeColor.withValues(alpha: 0.06),
                ),
                child: Image.asset(
                  AssetRes.backArrow,
                ),
              ),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Image.asset(
                  AssetRes.themeLabel,
                  height: 28,
                  width: 94,
                ),
                const SizedBox(width: 4),
                Text(
                  S.current.randoms,
                  style: const TextStyle(
                    color: ColorRes.black,
                    fontSize: 21,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
