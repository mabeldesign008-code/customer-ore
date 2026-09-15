import 'package:flutter/material.dart';
import 'package:orange_ui/screen/explore_screen/explore_screen_view_model.dart';
import 'package:orange_ui/screen/explore_screen/widgets/full_image_view.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';

class SuggestPhotoTapView extends StatelessWidget {
  final ExploreScreenViewModel model;
  final int index;

  const SuggestPhotoTapView(
      {super.key, required this.model, required this.index});

  @override
  Widget build(BuildContext context) {
    return (model.currentCombinedIndex == index &&
            model.suggestPhotoTapStatus == 0 &&
            model.suggestSwipeStatus == 1)
        ? GestureDetector(
            onTap: () => model.onSuggestPhotoTap(true, isSwipe: true),
            onHorizontalDragEnd: (details) {
              model.onSuggestPhotoTap(true, isSwipe: true);
            },
            onVerticalDragEnd: (details) {
              model.onSuggestPhotoTap(true, isSwipe: true);
            },
            child: Container(
              width: double.infinity,
              height: double.infinity,
              decoration: BoxDecoration(
                color: ColorRes.black.withValues(alpha: .7),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                children: [
                  Expanded(
                      child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Image.asset(
                        AssetRes.icLeftTap,
                        height: 50,
                        width: 50,
                        color: ColorRes.white,
                      ),
                      const Text(
                        'LAST\nPHOTO',
                        style: TextStyle(
                            color: ColorRes.white,
                            fontFamily: FontRes.medium,
                            letterSpacing: 1,
                            fontSize: 18),
                      )
                    ],
                  )),
                  const Expanded(child: BorderLineCustom(color: ColorRes.grey)),
                  Expanded(
                      child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Image.asset(AssetRes.icRightTap,
                          height: 50, width: 50, color: ColorRes.white),
                      const SizedBox(height: 10),
                      const Text('NEXT\nPHOTO',
                          style: TextStyle(
                              color: ColorRes.white,
                              fontFamily: FontRes.medium,
                              letterSpacing: 1,
                              fontSize: 18))
                    ],
                  )),
                ],
              ),
            ),
          )
        : const SizedBox();
  }
}
