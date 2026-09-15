import 'package:flutter/material.dart';
import 'package:orange_ui/screen/explore_screen/explore_screen_view_model.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/style_res.dart';

class BottomButtons extends StatelessWidget {
  final ExploreScreenViewModel model;

  const BottomButtons({
    super.key,
    required this.model,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: [
        const SizedBox(width: 20),
        CustomButton(
            onTap: model.onReverseBtnTap,
            icon: AssetRes.icReverse,
            iconSize: 20,
            iconColor: ColorRes.dimGrey6),
        InkWell(
          onTap: () => model.onLikeDislikeTap(true),
          child: Container(
            height: 70,
            width: 70,
            decoration: BoxDecoration(
                gradient: StyleRes.linearGradient,
                borderRadius: BorderRadius.circular(50),
                boxShadow: const [
                  BoxShadow(color: ColorRes.aquaHaze, blurRadius: 5.0, offset: Offset(5, 8)),
                ]),
            child: Align(
              alignment: const Alignment(0, .1),
              child: Image.asset(
                  model.combinedList[model.currentCombinedIndex].isLiked == true
                      ? AssetRes.icFillFav
                      : AssetRes.icFav,
                  width: 37,
                  color: ColorRes.white),
            ),
          ),
        ),
        CustomButton(
            onTap: () => model.onLikeDislikeTap(false),
            icon: AssetRes.icClose,
            iconColor: ColorRes.dimGrey6,
            iconSize: 20),
        const SizedBox(width: 20),
      ],
    );
  }
}

class CustomButton extends StatelessWidget {
  final VoidCallback onTap;
  final double? size;
  final Color? iconColor;
  final String icon;
  final double iconSize;

  const CustomButton(
      {super.key,
      required this.onTap,
    this.size,
    this.iconColor,
    required this.icon,
      required this.iconSize});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        height: size ?? 45,
        width: size ?? 45,
        decoration: BoxDecoration(
            color: ColorRes.white,
            borderRadius: BorderRadius.circular(50),
            boxShadow: [
              BoxShadow(
                  color: ColorRes.black.withValues(alpha: .15),
                  blurRadius: 9.5,
                  offset: const Offset(0, 4)),
            ]),
        child: Center(
          child: Image.asset(
            icon,
            width: iconSize,
            height: iconSize,
            color: iconColor ?? ColorRes.themeColor,
          ),
        ),
      ),
    );
  }
}

// class PlayBtnClick extends StatefulWidget {
//   final VoidCallback onPlayBtnClick;
//
//   const PlayBtnClick({Key? key, required this.onPlayBtnClick}) : super(key: key);
//
//   @override
//   State<PlayBtnClick> createState() => _PlayBtnClickState();
// }
//
// class _PlayBtnClickState extends State<PlayBtnClick> with SingleTickerProviderStateMixin {
//   late double _scale;
//   late AnimationController _controller;
//
//   @override
//   void initState() {
//     _controller = AnimationController(
//       vsync: this,
//       duration: const Duration(
//         milliseconds: 100,
//       ),
//       lowerBound: 0.0,
//       upperBound: 0.1,
//     )..addListener(() {
//         setState(() {});
//       });
//     super.initState();
//   }
//
//   @override
//   void dispose() {
//     super.dispose();
//     _controller.dispose();
//   }
//
//   void _tapDown(TapDownDetails details) {
//     _controller.forward();
//   }
//
//   void _tapUp(TapUpDetails details) {
//     _controller.reverse();
//   }
//
//   @override
//   Widget build(BuildContext context) {
//     _scale = 1 - _controller.value;
//     return InkWell(
//       onTap: widget.onPlayBtnClick,
//       splashColor: ColorRes.transparent,
//       highlightColor: ColorRes.transparent,
//       onTapDown: _tapDown,
//       onTapUp: _tapUp,
//       borderRadius: BorderRadius.circular(10),
//       child: Transform.scale(
//         scale: _scale,
//         child: Container(
//           height: 51,
//           width: 51,
//           decoration: BoxDecoration(
//             color: ColorRes.white,
//             borderRadius: BorderRadius.circular(10),
//             boxShadow: [
//               BoxShadow(
//                 offset: const Offset(1.7, 1.5),
//                 color: ColorRes.lightGrey.withValues(alpha: 0.7),
//                 blurRadius: 3,
//               ),
//             ],
//           ),
//           child: Center(
//             child: Transform.rotate(
//               angle: 3.1,
//               child: GradientWidget(
//                 child: Image.asset(
//                   AssetRes.playButton,
//                   height: 25,
//                   width: 25,
//                   color: ColorRes.white,
//                 ),
//               ),
//             ),
//           ),
//         ),
//       ),
//     );
//   }
// }
