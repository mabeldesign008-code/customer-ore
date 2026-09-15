import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/common/animation/ripple_animation.dart';
import 'package:orange_ui/common/button/custom_text_button.dart';
import 'package:orange_ui/common/custom_image.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/chat_and_live_stream/live_stream.dart';
import 'package:orange_ui/screen/livestream_end_screen/livestream_end_screen_view_model.dart';
import 'package:orange_ui/service/extention/int_extention.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/font_res.dart';
import 'package:stacked/stacked.dart';

class LivestreamEndScreen extends StatefulWidget {
  final LiveStreamUser liveStreamUser;
  final String dateTime;
  final String duration;

  const LivestreamEndScreen(
      {super.key,
      required this.liveStreamUser,
      required this.dateTime,
      required this.duration});

  @override
  State<LivestreamEndScreen> createState() => _LivestreamEndScreenState();
}

class _LivestreamEndScreenState extends State<LivestreamEndScreen>
    with TickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    duration: const Duration(seconds: 1),
    vsync: this,
  );
  late final Animation<double> _animation = CurvedAnimation(
    parent: _controller,
    curve: Curves.fastOutSlowIn,
  );

  @override
  Widget build(BuildContext context) {
    _controller.forward();
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return ViewModelBuilder<LivestreamEndScreenViewModel>.reactive(
          onViewModelReady: (model) {
            model.init(widget.liveStreamUser, widget.dateTime, widget.duration);
          },
          viewModelBuilder: () => LivestreamEndScreenViewModel(),
          builder: (context, model, child) {
            return Scaffold(
              body: SafeArea(
                child: Column(
                  children: [
                    Container(
                      width: Get.width,
                      height: Get.height / 2,
                      decoration: const BoxDecoration(
                        image: DecorationImage(
                            fit: BoxFit.cover,
                            image: AssetImage(AssetRes.worldMap)),
                      ),
                      child: RipplesAnimation(
                        child: CustomImage(
                          image: widget.liveStreamUser.userImage ?? '',
                          height: Get.width / 2.5,
                          width: Get.width / 2.5,
                          radius: 90,
                        ),
                      ),
                    ),
                    const Spacer(),
                    ScaleTransition(
                      scale: _animation,
                      child: Text(
                        S
                            .of(context)
                            .yourLiveStreamHasBeenEndednbelowIsASummaryOf,
                        style: const TextStyle(
                            fontFamily: FontRes.semiBold, fontSize: 18),
                        textAlign: TextAlign.center,
                      ),
                    ),
                    const Spacer(),
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            children: [
                              SizeTransition(
                                sizeFactor: _animation,
                                axis: Axis.horizontal,
                                axisAlignment: -1,
                                child: Text(widget.duration,
                                    style: const TextStyle(
                                        fontFamily: FontRes.semiBold,
                                        fontSize: 15)),
                              ),
                              Text(
                                S.of(context).streamFor,
                                style: const TextStyle(
                                    fontFamily: FontRes.semiBold, fontSize: 15),
                              ),
                            ],
                          ),
                        ),
                        Expanded(
                          child: Column(
                            children: [
                              SizeTransition(
                                sizeFactor: _animation,
                                axis: Axis.horizontal,
                                axisAlignment: -1,
                                child: Text(
                                    '${widget.liveStreamUser.joinedUser?.length ?? 0}',
                                    style: const TextStyle(
                                        fontFamily: FontRes.semiBold,
                                        fontSize: 15)),
                              ),
                              Text(
                                S.of(context).users,
                                style: const TextStyle(
                                    fontFamily: FontRes.semiBold, fontSize: 15),
                              ),
                            ],
                          ),
                        ),
                        Expanded(
                          child: Column(
                            children: [
                              SizeTransition(
                                sizeFactor: _animation,
                                axis: Axis.horizontal,
                                axisAlignment: -1,
                                child: Text(
                                    (widget.liveStreamUser.collectedDiamond ??
                                            0)
                                        .toInt()
                                        .numberFormat,
                                    style: const TextStyle(
                                        fontFamily: FontRes.semiBold,
                                        fontSize: 15)),
                              ),
                              Row(
                                spacing: 5,
                                children: [
                                  Image.asset(AssetRes.diamond,
                                      height: 18, width: 18),
                                  Text(
                                    S.of(context).collected,
                                    style: const TextStyle(
                                        fontFamily: FontRes.semiBold,
                                        fontSize: 15),
                                  ),
                                ],
                              )
                            ],
                          ),
                        ),
                      ],
                    ),
                    const Spacer(),
                    Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 28, vertical: 10),
                      child: CustomTextButton(
                        onTap: Get.back,
                        title: S.current.ok,
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }
}
