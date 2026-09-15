import 'package:flutter/material.dart';
import 'package:orange_ui/common/common_ui.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/chat_and_live_stream/chat.dart';
import 'package:orange_ui/screen/message_screen/message_screen_view_model.dart';
import 'package:orange_ui/screen/message_screen/widgets/user_card.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';
import 'package:stacked/stacked.dart';

class MessageScreen extends StatelessWidget {
  const MessageScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ViewModelBuilder<MessageScreenViewModel>.reactive(
      onViewModelReady: (model) {
        model.init();
      },
      viewModelBuilder: () => MessageScreenViewModel(),
      builder: (context, model, child) {
        return Column(
          children: [
            model.isLoading && model.userList.isEmpty
                ? CommonUI.lottieWidget()
                : !model.isLoading && model.userList.isEmpty
                    ? Center(
                        child: Text(
                          S.of(context).noData,
                          style: const TextStyle(
                              color: ColorRes.darkGrey9,
                              fontFamily: FontRes.semiBold,
                              fontSize: 17),
                        ),
                      )
                    : Expanded(
                        child: ListView.builder(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 15),
                          itemCount: model.userList.length,
                          physics: const BouncingScrollPhysics(),
                          itemBuilder: (context, index) {
                            Conversation conversation = model.userList[index];
                            ChatUser? chatUser = conversation.user;
                            return InkWell(
                              onTap: () => model.onUserTap(conversation),
                              onLongPress: () =>
                                  model.onLongPress(conversation),
                              child: UserCard(
                                name: chatUser?.username ?? '',
                                age: chatUser?.age ?? '',
                                msg: conversation.lastMsg!.isEmpty
                                    ? ''
                                    : conversation.lastMsg,
                                time: conversation.time.toString(),
                                image: chatUser?.image ?? '',
                                newMsg: chatUser?.isNewMsg ?? false,
                                tickMark: chatUser?.isHost,
                              ),
                            );
                          },
                        ),
                      ),
          ],
        );
      },
    );
  }
}
