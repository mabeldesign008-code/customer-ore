import 'dart:io';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:orange_ui/model/chat_and_live_stream/chat.dart';
import 'package:orange_ui/screen/chat_screen/chat_screen_view_model.dart';
import 'package:orange_ui/service/session_manager.dart';
import 'package:orange_ui/utils/app_res.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/const_res.dart';
import 'package:orange_ui/utils/firebase_res.dart';
import 'package:orange_ui/utils/font_res.dart';
import 'package:orange_ui/utils/style_res.dart';

class ChatArea extends StatelessWidget {
  final Map<String, List<ChatMessage>>? chatData;
  final Function(ChatMessage? data) onImageTap;
  final ScrollController scrollController;
  final Function(ChatMessage? data) onVideoItemClick;
  final Function(ChatMessage? data) onLongPress;
  final List<String> timeStamp;
  final ChatScreenViewModel model;

  const ChatArea({
    super.key,
    required this.chatData,
    required this.onImageTap,
    required this.scrollController,
    required this.onVideoItemClick,
    required this.onLongPress,
    required this.timeStamp,
    required this.model,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: NotificationListener<OverscrollIndicatorNotification>(
        onNotification: (overscroll) {
          overscroll.disallowIndicator();
          return true;
        },
        child: ListView.builder(
          controller: scrollController,
          reverse: true,
          padding: const EdgeInsets.only(bottom: 10),
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          itemCount: chatData != null ? chatData?.keys.length : 0,
          physics: Platform.isAndroid
              ? const ClampingScrollPhysics()
              : const BouncingScrollPhysics(),
          itemBuilder: (context, index) {
            String? date = chatData?.keys.elementAt(index) ?? '';
            List<ChatMessage>? messages = chatData?[date];
            return Column(
              children: [
                alertView(date),
                ListView.builder(
                  itemCount: messages?.length,
                  reverse: true,
                  shrinkWrap: true,
                  physics: const BouncingScrollPhysics(),
                  padding: EdgeInsets.zero,
                  itemBuilder: (context, index) {
                    ChatMessage? data = messages?[index];
                    return userMessageWidget(data, model: model);
                  },
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget userMessageWidget(ChatMessage? data,
      {required ChatScreenViewModel model}) {
    bool isMsgSelected = timeStamp.contains('${data?.time?.round()}');
    bool isMe = data?.senderUser?.userid == SessionManager.instance.getUserID();
    return InkWell(
      onLongPress: () => onLongPress(data),
      onTap: () {
        timeStamp.isNotEmpty ? onLongPress(data) : () {};
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
        decoration: BoxDecoration(
          color: ColorRes.white,
          borderRadius: BorderRadius.circular(10),
        ),
        foregroundDecoration: BoxDecoration(
          color: isMsgSelected
              ? ColorRes.themeColor.withValues(alpha: 0.3)
              : ColorRes.transparent,
          borderRadius: isMsgSelected
              ? BorderRadius.circular(0)
              : BorderRadius.circular(10),
        ),
        child: Row(
          mainAxisAlignment:
              isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
          children: [
            if (isMe) _dateFormater(data?.time),
            Container(
              decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(8),
                  color: isMe ? null : ColorRes.grey10,
                  gradient: !isMe ? null : StyleRes.linearGradient),
              child: data?.msgType == FirebaseRes.msg
                  ? _textMessage(data)
                  : data?.msgType == FirebaseRes.image
                      ? imageMessage(data, model: model)
                      : videoMessage(data, model: model),
            ),
            if (!isMe) _dateFormater(data?.time),
          ],
        ),
      ),
    );
  }

  Widget _textMessage(ChatMessage? data, {EdgeInsets? padding}) {
    bool isMe = data?.senderUser?.userid == SessionManager.instance.getUserID();
    return ConstrainedBox(
      constraints: BoxConstraints(
          maxWidth: data?.msgType == FirebaseRes.msg
              ? Get.width / 1.4
              : Get.width / 1.7),
      child: Padding(
        padding: padding ??
            const EdgeInsets.symmetric(vertical: 13.0, horizontal: 11),
        child: Text(
          data?.msg ?? '',
          style: TextStyle(
              color: isMe ? ColorRes.white : ColorRes.darkGrey,
              fontFamily: FontRes.regular),
        ),
      ),
    );
  }

  Widget imageMessage(ChatMessage? data, {required ChatScreenViewModel model}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        imageVideoPosterWidget(
            data: data,
            onTap: model.timeStamp.isEmpty ? (data) => onImageTap(data) : null),
        if ((data?.msg ?? '').isNotEmpty)
          _textMessage(data,
              padding: const EdgeInsets.only(bottom: 8.0, left: 10, right: 10)),
      ],
    );
  }

  Widget videoMessage(ChatMessage? data, {required ChatScreenViewModel model}) {
    return Stack(
      alignment: Alignment.center,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            imageVideoPosterWidget(
                data: data,
                onTap: model.timeStamp.isEmpty ? onVideoItemClick : null),
            if ((data?.msg ?? '').isNotEmpty)
              _textMessage(data,
                  padding:
                      const EdgeInsets.only(bottom: 8.0, left: 10, right: 10)),
          ],
        ),
      ],
    );
  }

  Widget _dateFormater(double? time) {
    if (time == null) {
      return const SizedBox();
    }
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 10.0),
      child: Text(
          DateFormat(AppRes.hmmA)
              .format(DateTime.fromMillisecondsSinceEpoch(time.toInt())),
          style: const TextStyle(color: ColorRes.grey2, fontSize: 12)),
    );
  }

  Widget alertView(String? time) {
    return Center(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 38, vertical: 8),
        margin: const EdgeInsets.symmetric(vertical: 3),
        decoration: BoxDecoration(
          color: ColorRes.grey13,
          borderRadius: BorderRadius.circular(5),
        ),
        child: Text('$time',
            style: const TextStyle(color: ColorRes.darkGrey9, fontSize: 11)),
      ),
    );
  }

  Widget imageVideoPosterWidget(
      {ChatMessage? data, Function(ChatMessage? data)? onTap}) {
    return InkWell(
      onTap: onTap != null ? () => onTap(data) : null,
      child: Container(
        padding: const EdgeInsets.all(5.0),
        height: Get.width / 1.7,
        width: Get.width / 1.7,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(5),
          child: Stack(
            alignment: Alignment.center,
            children: [
              CachedNetworkImage(
                  imageUrl: '${ConstRes.aImageBaseUrl}${data?.image}',
                  cacheKey: '${data?.image}',
                  height: Get.width / 1.7,
                  width: Get.width / 1.7,
                  fit: BoxFit.cover),
              if (data?.msgType == FirebaseRes.video)
                Container(
                  height: 31,
                  width: 31,
                  decoration: BoxDecoration(
                      color: ColorRes.white.withValues(alpha: 0.30),
                      shape: BoxShape.circle),
                  child: Center(
                      child: Image.asset(AssetRes.playButton,
                          height: 16, width: 15, color: ColorRes.white)),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
