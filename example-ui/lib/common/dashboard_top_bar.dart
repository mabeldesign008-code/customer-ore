import 'package:flutter/material.dart';
import 'package:orange_ui/common/button/round_icon_button.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';

class DashboardTopBar extends StatelessWidget {
  final VoidCallback onNotificationTap;
  final VoidCallback? onTitleTap;
  final VoidCallback onSearchTap;
  final VoidCallback onLivesBtnClick;
  final int? isDating;

  const DashboardTopBar({super.key,
      required this.onNotificationTap,
      this.onTitleTap,
      required this.onSearchTap,
      required this.onLivesBtnClick,
      required this.isDating});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 15.0, vertical: 5),
      child: Row(
        children: [
          InkWell(
            onTap: onTitleTap,
            child: Image.asset(AssetRes.themeLabel, height: 30),
          ),
          const Spacer(),
          Row(
            spacing: 5,
            children: [
              InkWell(
                onTap: onLivesBtnClick,
                child: Container(
                  height: 37,
                  decoration: BoxDecoration(
                      color: ColorRes.themeColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(30)),
                  padding: const EdgeInsets.symmetric(horizontal: 15),
                  child: Row(
                    children: [
                      Image.asset(
                        AssetRes.sun,
                        height: 20,
                        width: 20,
                        color: ColorRes.themeColor,
                      ),
                      const SizedBox(width: 5),
                      Text(S.of(context).lives,
                          style: const TextStyle(
                              fontFamily: FontRes.regular,
                              fontSize: 12,
                              color: ColorRes.themeColor))
                    ],
                  ),
                ),
              ),
              if (isDating == 1)
                RoundIconButton(
                    onTap: onNotificationTap, icon: AssetRes.bell, padding: 8),
              RoundIconButton(
                  onTap: onSearchTap, icon: AssetRes.search, padding: 8),
            ],
          )
        ],
      ),
    );
  }
}
