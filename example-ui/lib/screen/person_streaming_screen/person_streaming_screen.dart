import 'package:flutter/material.dart';
import 'package:orange_ui/common/common_ui.dart';
import 'package:orange_ui/model/chat_and_live_stream/live_stream.dart';
import 'package:orange_ui/model/setting_model.dart';
import 'package:orange_ui/screen/person_streaming_screen/person_streaming_screen_view_model.dart';
import 'package:orange_ui/screen/person_streaming_screen/widgets/bottom_text_field.dart';
import 'package:orange_ui/screen/person_streaming_screen/widgets/comment_list_area.dart';
import 'package:orange_ui/screen/person_streaming_screen/widgets/person_top_bar_area.dart';
import 'package:stacked/stacked.dart';

class PersonStreamingScreen extends StatelessWidget {
  final LiveStreamUser? liveStreamUser;
  final Appdata? settingAppData;

  const PersonStreamingScreen(
      {super.key, this.liveStreamUser, this.settingAppData});

  @override
  Widget build(BuildContext context) {
    return ViewModelBuilder<PersonStreamingScreenViewModel>.reactive(
      onViewModelReady: (model) {
        model.init();
      },
      viewModelBuilder: () =>
          PersonStreamingScreenViewModel(liveStreamUser: liveStreamUser, settingAppData: settingAppData),
      builder: (context, model, child) {
        return PopScope(
          canPop: false,
          child: Scaffold(
              body: Stack(
            children: [
              model.isLoading ? CommonUI.lottieWidget() : model.remoteVideo(),
              Column(
                children: [
                  PersonTopBarArea(
                    onViewTap: model.onViewTap,
                    onMoreBtnTap: model.onMoreBtnTap,
                    onExitTap: model.onExitTap,
                    liveStreamUser: model.liveStreamUser,
                    onUserTap: model.onUserTap,
                  ),
                  const Spacer(),
                  CommentListArea(
                    commentList: model.commentList,
                    pageContext: context,
                  ),
                  BottomTextField(
                    commentController: model.commentController,
                    commentFocus: model.commentFocus,
                    onMsgSend: model.onCommentSend,
                    onGiftTap: model.onGiftBtnTap,
                    count: model.countDownValue,
                  ),
                  const SizedBox(height: 16),
                ],
              ),
            ],
          )),
        );
      },
    );
  }
}
