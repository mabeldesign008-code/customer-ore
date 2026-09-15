import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/common/button/round_icon_button.dart';
import 'package:orange_ui/common/common_ui.dart';
import 'package:orange_ui/model/chat_and_live_stream/chat.dart';
import 'package:orange_ui/utils/app_res.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';

class ChatTopBarArea extends StatelessWidget {
  final Conversation? conversation;
  final Function(String value) onMoreBtnTap;
  final String blockUnblock;
  final VoidCallback onUserTap;

  const ChatTopBarArea({super.key,
      required this.conversation,
      required this.onMoreBtnTap,
      required this.blockUnblock,
      required this.onUserTap,
  });

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
            child: Row(
              children: [
                const RoundIconButton(bgColor: ColorRes.transparent),
                const SizedBox(width: 15),
                ClipRRect(
                  borderRadius: BorderRadius.circular(30),
                  child: CachedNetworkImage(
                    imageUrl: '${conversation?.user?.image}',
                    cacheKey: '${conversation?.user?.image}',
                    height: 37,
                    width: 37,
                    fit: BoxFit.cover,
                    errorWidget: (context, url, error) {
                      return CommonUI.profileImagePlaceHolder(
                          name: conversation?.user?.username, heightWidth: 37);
                    },
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: InkWell(
                    onTap: onUserTap,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              conversation?.user?.username != null
                                  ? '${conversation?.user?.username} '.capitalize ?? ''
                                  : ' ',
                              style: const TextStyle(
                                color: ColorRes.darkGrey,
                                fontSize: 16,
                                fontFamily: FontRes.bold,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            Text(
                              conversation?.user?.age != null ? "${conversation?.user?.age}" : '',
                              style: const TextStyle(
                                color: ColorRes.darkGrey,
                                fontSize: 16,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(width: 5),
                            Visibility(
                                visible: conversation != null &&
                                    conversation?.user != null &&
                                    conversation?.user?.isHost != null &&
                                    conversation!.user!.isHost!,
                                child: Image.asset(AssetRes.tickMark, height: 15, width: 15)),
                          ],
                        ),
                        Text(
                          conversation?.user?.city != null ? "${conversation?.user?.city}" : '',
                          style: const TextStyle(
                            color: ColorRes.darkGrey9,
                            fontSize: 13,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 15),
                PopupMenuButton<String>(
                  onSelected: (value) {
                    onMoreBtnTap(value);
                  },
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                  elevation: 3,
                  itemBuilder: (BuildContext context) {
                    return {blockUnblock, AppRes.report}.map(
                      (String choice) {
                        return PopupMenuItem<String>(
                          value: choice,
                          child: Text(choice),
                        );
                      },
                    ).toList();
                  },
                  child: Image.asset(
                    AssetRes.moreHorizontal,
                    height: 27,
                    width: 27,
                  ),
                ),
              ],
            ),
          ),
          Container(
            height: 0.5,
            width: Get.width,
            margin: const EdgeInsets.only(right: 10, left: 10, bottom: 5.5),
            color: ColorRes.grey2,
          ),
        ],
      ),
    );
  }
}
