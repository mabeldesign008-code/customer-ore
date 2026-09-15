import 'package:flutter/material.dart';
import 'package:orange_ui/common/common_fun.dart';
import 'package:orange_ui/screen/create_post_screen/create_post_screen_view_model.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';
import 'package:video_player/video_player.dart';

class VideoPostView extends StatelessWidget {
  final CreatePostScreenViewModel model;

  const VideoPostView({super.key, required this.model});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: model.videoPlayPause,
      child: Container(
        height: 390,
        width: double.infinity,
        color: ColorRes.black,
        margin: const EdgeInsets.only(bottom: 10.0),
        child: !model.videoPlayerController.value.isInitialized
            ? const SizedBox()
            : Stack(
                alignment: Alignment.center,
                children: [
                  InkWell(
                      onTap: model.videoPlayPause,
                      child: AspectRatio(
                          aspectRatio: model.videoPlayerController.value.aspectRatio,
                          child: VideoPlayer(model.videoPlayerController))),
                  ValueListenableBuilder(
                    valueListenable: model.videoPlayerController,
                    builder: (context, VideoPlayerValue value, child) => Column(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        model.pageType == 1
                            ? Container(height: 39, width: 39, margin: const EdgeInsets.all(15))
                            : Align(
                                alignment: Alignment.topRight,
                                child: InkWell(
                                  onTap: model.onVideoDelete,
                                  child: FittedBox(
                                    child: Container(
                                      height: 39,
                                      width: 39,
                                      margin: const EdgeInsets.all(15),
                                      decoration: ShapeDecoration(
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                                        color: ColorRes.white.withValues(alpha: 0.3),
                                      ),
                                      alignment: Alignment.center,
                                      child: Image.asset(AssetRes.icBin, color: ColorRes.white, width: 21, height: 21),
                                    ),
                                  ),
                                ),
                              ),
                        AnimatedOpacity(
                          duration: const Duration(milliseconds: 500),
                          opacity: value.isPlaying ? 0.0 : 1.0,
                          child: InkWell(
                            onTap: model.videoPlayPause,
                            child: Container(
                              width: 55,
                              height: 55,
                              margin: const EdgeInsets.all(10),
                              decoration: ShapeDecoration(
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                                  color: ColorRes.black.withValues(alpha: 0.4)),
                              alignment: Alignment.center,
                              child: Image.asset(value.isPlaying ? AssetRes.icPause : AssetRes.icPlay,
                                  color: ColorRes.white, width: 20, height: 20, alignment: Alignment.centerRight),
                            ),
                          ),
                        ),
                        Container(
                          margin: const EdgeInsets.all(15),
                          padding: const EdgeInsets.all(10),
                          decoration: ShapeDecoration(
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(5)),
                              color: ColorRes.black.withValues(alpha: 0.3)),
                          child: Row(
                            children: [
                              SizedBox(
                                width: 35,
                                child: Text(
                                  CommonFun.printDuration(value.position),
                                  style: const TextStyle(
                                      color: ColorRes.white,
                                      fontFamily: FontRes.light,
                                      fontSize: 12,
                                      letterSpacing: 0.5),
                                ),
                              ),
                              Expanded(
                                child: SliderTheme(
                                  data: SliderThemeData(
                                    trackHeight: 2,
                                    overlayShape: SliderComponentShape.noOverlay,
                                  ),
                                  child: Slider(
                                      value: value.position.inMicroseconds.toDouble(),
                                      max: value.duration.inMicroseconds.toDouble(),
                                      activeColor: ColorRes.themeColor,
                                      onChanged: model.onChangeSlider,
                                      onChangeEnd: model.onChangeSliderEnd,
                                      onChangeStart: model.onChangeSliderStart,
                                      inactiveColor: ColorRes.dimGrey3),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Text(
                                CommonFun.printDuration(value.duration),
                                style: const TextStyle(
                                    color: ColorRes.white, fontFamily: FontRes.light, fontSize: 12, letterSpacing: 0.5),
                              ),
                            ],
                          ),
                        )
                      ],
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}
