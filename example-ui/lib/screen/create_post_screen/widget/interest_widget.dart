import 'package:flutter/material.dart';
import 'package:orange_ui/common/gradient_widget.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/screen/create_post_screen/create_post_screen_view_model.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';
import 'package:orange_ui/utils/style_res.dart';

class InterestWidget extends StatelessWidget {
  final CreatePostScreenViewModel model;

  const InterestWidget({super.key, required this.model});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 15.0, right: 15.0, bottom: 10.0),
          child: Text(
            S.of(context).selectInterestsToContinue,
            style: const TextStyle(fontFamily: FontRes.semiBold, fontSize: 18, color: ColorRes.darkGrey),
          ),
        ),
        Center(
          child: SafeArea(
            top: false,
            child: Wrap(
              crossAxisAlignment: WrapCrossAlignment.center,
              alignment: WrapAlignment.center,
              children: List.generate(
                model.interests.length,
                (index) {
                  bool isSelected = model.selectedInterests.contains(model.interests[index].id);
                  return InkWell(
                    onTap: () => model.onInterestTap(model.interests[index].id ?? -1),
                    child: isSelected
                        ? Padding(
                            padding: const EdgeInsets.all(5.0),
                            child: UnicornOutlineButton(
                              strokeWidth: 3,
                              radius: 30,
                              gradient: StyleRes.linearGradient,
                              onPressed: () => model.onInterestTap(model.interests[index].id ?? -1),
                              margin: EdgeInsets.zero,
                              padding: const EdgeInsets.symmetric(horizontal: 25, vertical: 12),
                              child: GradientText(
                                (model.interests[index].title ?? '').toUpperCase(),
                                gradient: StyleRes.linearGradient,
                                style: const TextStyle(fontFamily: FontRes.bold, fontSize: 12, letterSpacing: 0.5),
                              ),
                            ),
                          )
                        : Container(
                            margin: const EdgeInsets.all(5),
                            padding: const EdgeInsets.symmetric(horizontal: 25, vertical: 12),
                            decoration: ShapeDecoration(
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                                color: ColorRes.aquaHaze),
                            child: Text((model.interests[index].title ?? '').toUpperCase(),
                                style: const TextStyle(
                                    color: ColorRes.grey19, fontFamily: FontRes.bold, fontSize: 12, letterSpacing: 0.5),
                                textAlign: TextAlign.center),
                          ),
                  );
                },
              ),
            ),
          ),
        )
      ],
    );
  }
}
