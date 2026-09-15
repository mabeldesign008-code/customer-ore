import 'package:agora_rtc_engine/agora_rtc_engine.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:orange_ui/common/common_ui.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/screen/random_streming_screen/random_streaming_screen_view_model.dart';
import 'package:orange_ui/screen/random_streming_screen/widgets/bottom_text_field.dart';
import 'package:orange_ui/screen/random_streming_screen/widgets/comment_list_area.dart';
import 'package:orange_ui/screen/random_streming_screen/widgets/randon_stream_top_bar_area.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:stacked/stacked.dart';

import '../../model/chat_and_live_stream/live_stream.dart';
import '../../model/setting_model.dart';

class RandomStreamingScreen extends StatelessWidget {
  final UserData? userData;
  final LiveStreamUser liveStreamUser;
  final Appdata? settingData;

  const RandomStreamingScreen(
      {super.key,
      this.userData,
      required this.liveStreamUser,
      this.settingData});

  @override
  Widget build(BuildContext context) {
    SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
      // Status bar color
      statusBarColor: ColorRes.transparent,

      // Status bar brightness (optional)
      statusBarIconBrightness: Brightness.dark, // For Android (dark icons)
      statusBarBrightness: Brightness.light, // For iOS (dark icons)
    ));
    return ViewModelBuilder<RandomStreamingScreenViewModel>.reactive(
      onViewModelReady: (model) {
        model.init();
      },
      viewModelBuilder: () => RandomStreamingScreenViewModel(
          liveStreamUser: liveStreamUser, registrationUserData: userData, settingAppData: settingData),
      builder: (context, model, child) {
        return PopScope(
          onPopInvokedWithResult: (didPop, _) => model.onEndVideoTap(),
          canPop: false,
          child: Scaffold(
            body: Stack(
              children: [
                model.isLoading
                    ? CommonUI.lottieWidget()
                    : model.localUserJoined
                        ? AgoraVideoView(
                            controller: VideoViewController(rtcEngine: model.engine, canvas: const VideoCanvas(uid: 0)))
                        : CommonUI.lottieWidget(),
                InkWell(
                  onTap: () {
                    model.commentFocus.unfocus();
                  },
                  splashColor: ColorRes.transparent,
                  highlightColor: ColorRes.transparent,
                  child: Column(
                    children: [
                      RandomStreamTopBarArea(
                        onEndBtnTap: model.onEndBtnTap,
                        onDiamondTap: model.onDiamondTap,
                        onSpeakerTap: model.onSpeakerTap,
                        onCameraTap: model.onCameraTap,
                        mute: model.muted,
                        user: model.liveStreamUser,
                      ),
                      const Spacer(),
                      CommentListArea(
                        commentList: model.commentList,
                        pageContext: context,
                      ),
                      BottomTextField(
                        commentController: model.commentController,
                        onMsgSend: model.onCommentSend,
                        commentFocus: model.commentFocus,
                      ),
                      const SizedBox(height: 16),
                    ],
                  ),
                )
              ],
            ),
          ),
        );
      },
    );
  }
}
