import 'dart:ui';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/chat_and_live_stream/live_stream.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';

class PersonTopBarArea extends StatelessWidget {
  final VoidCallback onViewTap;
  final VoidCallback onExitTap;
  final VoidCallback onMoreBtnTap;
  final LiveStreamUser? liveStreamUser;
  final VoidCallback onUserTap;

  const PersonTopBarArea({super.key,
      required this.onViewTap,
      required this.onExitTap,
      required this.onMoreBtnTap,
      this.liveStreamUser,
      required this.onUserTap});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: Column(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 1, sigmaY: 1),
              child: Container(
                height: 60,
                width: Get.width,
                margin: const EdgeInsets.symmetric(horizontal: 10),
                padding: const EdgeInsets.fromLTRB(13, 8, 23, 9),
                decoration: BoxDecoration(
                  color: ColorRes.black.withValues(alpha: 0.33),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  spacing: 8,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    InkWell(
                      onTap: onUserTap,
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(30),
                        child: CachedNetworkImage(
                          imageUrl: '${liveStreamUser?.userImage}',
                          cacheKey: '${liveStreamUser?.userImage}',
                          errorWidget: (context, error, stackTrace) {
                            return Image.asset(AssetRes.themeLabel,
                                width: 37, height: 37);
                          },
                          height: 37,
                          width: 37,
                          fit: BoxFit.cover,
                        ),
                      ),
                    ),
                    Expanded(
                      child: InkWell(
                        onTap: onUserTap,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Row(
                              children: [
                                Text(
                                  liveStreamUser?.fullName ?? 'Unknown',
                                  style: const TextStyle(
                                    color: ColorRes.white,
                                    fontSize: 16,
                                    fontFamily: FontRes.bold,
                                  ),
                                ),
                                Text(
                                  " ${liveStreamUser?.age ?? 0}",
                                  style: const TextStyle(
                                    color: ColorRes.white,
                                    fontSize: 16,
                                  ),
                                ),
                                const SizedBox(width: 3),
                                Stack(
                                  alignment: Alignment.center,
                                  children: [
                                    Container(
                                        height: 10,
                                        width: 10,
                                        color: ColorRes.white),
                                    Image.asset(AssetRes.tickMark,
                                        height: 18, width: 18),
                                  ],
                                ),
                              ],
                            ),
                            Expanded(
                              child: Text(liveStreamUser?.address ?? '',
                                  style: const TextStyle(
                                    color: ColorRes.white,
                                    fontSize: 11,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                  maxLines: 1),
                            ),
                          ],
                        ),
                      ),
                    ),
                    InkWell(
                      onTap: onMoreBtnTap,
                      child: Image.asset(AssetRes.moreHorizontal,
                          height: 15,
                          width: 25,
                          fit: BoxFit.cover,
                          color: ColorRes.white),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 5),
          ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 1, sigmaY: 1),
              child: InkWell(
                onTap: onViewTap,
                child: Container(
                  height: 39,
                  width: Get.width,
                  margin: const EdgeInsets.symmetric(horizontal: 10),
                  padding: const EdgeInsets.fromLTRB(13, 4, 4, 4),
                  decoration: BoxDecoration(
                    color: ColorRes.black.withValues(alpha: 0.33),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      Row(
                        children: [
                          Image.asset(AssetRes.themeLabelWhite,
                              height: 20, width: 69),
                          const SizedBox(width: 2),
                          Text(S.current.live,
                              style: const TextStyle(
                                  color: ColorRes.white, fontSize: 13)),
                          const Spacer(),
                          InkWell(
                            onTap: onExitTap,
                            child: Row(
                              children: [
                                Image.asset(AssetRes.exit,
                                    height: 20, width: 20),
                                const SizedBox(width: 3),
                                Text(S.current.exit,
                                    style: const TextStyle(
                                        color: ColorRes.white, fontSize: 13)),
                                const SizedBox(width: 13),
                              ],
                            ),
                          ),
                        ],
                      ),
                      Center(
                        child: Text(
                          "${NumberFormat.compact(locale: 'en').format(int.parse('${liveStreamUser?.watchingCount ?? '0'}'))} ${S.current.viewers}",
                          style: const TextStyle(
                            color: ColorRes.white,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
