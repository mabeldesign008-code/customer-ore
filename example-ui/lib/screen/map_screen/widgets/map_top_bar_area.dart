import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:orange_ui/common/button/round_icon_button.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';

class MapTopBarArea extends StatelessWidget {
  final List<int> distanceList;
  final int selectedDistance;
  final Function(int value) onDistanceChange;

  const MapTopBarArea({
    super.key,
    required this.distanceList,
    required this.selectedDistance,
    required this.onDistanceChange,
  });

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 10),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(10),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaY: 10, sigmaX: 10),
            child: Container(
              height: 54,
              padding: const EdgeInsets.fromLTRB(11, 8, 8, 8),
              decoration: BoxDecoration(
                color: ColorRes.aquaHaze.withValues(alpha: 0.5),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                children: [
                  const RoundIconButton(),
                  const SizedBox(width: 10),
                  Image.asset(AssetRes.themeLabel, height: 25, width: 75),
                  const SizedBox(width: 4),
                  Text(S.current.map, style: const TextStyle(color: ColorRes.black, fontSize: 15)),
                  const Spacer(),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 11, vertical: 6),
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: ColorRes.davyGrey.withValues(alpha: 0.10),
                      borderRadius: BorderRadius.circular(7),
                    ),
                    child: DropdownButton<int>(
                      underline: const SizedBox(),
                      icon: const Icon(Icons.keyboard_arrow_down),
                      padding: EdgeInsets.zero,
                      isDense: true,
                      items: distanceList
                          .map<DropdownMenuItem<int>>(
                            (e) => DropdownMenuItem(
                              value: e,
                              child: Text(
                                "$e ${S.current.km}",
                                style: const TextStyle(
                                  color: ColorRes.darkGrey9,
                                  fontFamily: FontRes.semiBold,
                                  fontSize: 14,
                                ),
                              ),
                            ),
                          )
                          .toList(),
                      value: selectedDistance,
                      onChanged: (int? value) {
                        if (value != null) {
                          onDistanceChange(value);
                        }
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
