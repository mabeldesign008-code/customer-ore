import 'dart:ui';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:figma_squircle/figma_squircle.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/common/common_ui.dart';
import 'package:orange_ui/common/live_icon.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/screen/user_detail_screen/user_detail_screen_view_model.dart';
import 'package:orange_ui/screen/user_detail_screen/widgets/hide_more_info_button.dart';
import 'package:orange_ui/service/session_manager.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/const_res.dart';
import 'package:orange_ui/utils/font_res.dart';
import 'package:orange_ui/utils/style_res.dart';

class ImageSelectionArea extends StatelessWidget {
  final VoidCallback onMoreInfoTap;

  final UserDetailScreenViewModel model;

  const ImageSelectionArea(
      {super.key, required this.onMoreInfoTap, required this.model});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: Get.width,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          joinBtnChip(),
          Column(
            spacing: 15,
            children: [
              if (model.settingAppData?.isDating == 1 &&
                  SessionManager.instance.getUserID() !=
                      model.otherUserData?.id)
                _LikeUnlikeBtn(model: model),
              _ImageList(model: model),
              HideMoreInfoButton(onHideBtnTap: onMoreInfoTap, isMoreInfo: false)
            ],
          )
        ],
      ),
    );
  }

  Widget joinBtnChip() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Visibility(
          visible:
              SessionManager.instance.getUserID() == model.otherUserData?.id
                  ? false
                  : true,
          child: Visibility(
            visible: model.otherUserData?.isLiveNow == 1 ? true : false,
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 15, vertical: 10),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(30),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaY: 10, sigmaX: 10),
                  child: InkWell(
                    onTap: model.onJoinBtnTap,
                    borderRadius: BorderRadius.circular(30),
                    child: Container(
                      height: 35,
                      padding: const EdgeInsets.all(2),
                      decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(30),
                          color: ColorRes.black.withValues(alpha: 0.33)),
                      child: Row(
                        children: [
                          const LiveIcon(),
                          const SizedBox(width: 3),
                          Text(S.current.liveCap,
                              style: const TextStyle(
                                  color: ColorRes.white, fontSize: 12)),
                          Text(
                            " ${S.current.nowCap}",
                            style: const TextStyle(
                                color: ColorRes.white,
                                fontSize: 12,
                                fontFamily: FontRes.bold),
                          ),
                          const SizedBox(width: 10),
                          Container(
                            height: 31,
                            width: 95,
                            decoration: BoxDecoration(
                                color: ColorRes.white.withValues(alpha: 0.10),
                                borderRadius: BorderRadius.circular(30)),
                            child: Center(
                              child: Text(
                                S.current.join,
                                style: const TextStyle(
                                    color: ColorRes.white,
                                    fontSize: 12,
                                    fontFamily: FontRes.bold),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
        if (model.settingAppData?.isSocialMedia == 1)
          InkWell(
            onTap: model.onPostBtnClick,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 23, vertical: 10),
              margin: const EdgeInsets.symmetric(horizontal: 15, vertical: 10),
              decoration: ShapeDecoration(
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(30)),
                  gradient: StyleRes.linearGradient),
              child: Row(
                children: [
                  Image.asset(AssetRes.icPostIcon, width: 15, height: 15),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 5.0),
                    child: Text(
                      S.current.posts.toUpperCase(),
                      style: TextStyle(
                          color: ColorRes.white.withValues(alpha: 0.8),
                          fontFamily: FontRes.bold,
                          fontSize: 11),
                    ),
                  )
                ],
              ),
            ),
          )
      ],
    );
  }
}

class _LikeUnlikeBtn extends StatefulWidget {
  final UserDetailScreenViewModel model;

  const _LikeUnlikeBtn({required this.model});

  @override
  State<_LikeUnlikeBtn> createState() => _LikeUnlikeBtnState();
}

class _LikeUnlikeBtnState extends State<_LikeUnlikeBtn>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
      duration: const Duration(milliseconds: 150), vsync: this, value: 1.0);

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final userData = widget.model.otherUserData;
    final bool isMe = widget.model.myUserId == userData?.id;
    final bool isLiked = userData?.isLiked ?? false;

    if (isMe) return const SizedBox();

    return InkWell(
      onTap: () {
        widget.model.onLikeBtnTap();
        _controller.reverse().then((_) => _controller.forward());
      },
      borderRadius: BorderRadius.circular(38),
      child: Container(
        height: 76,
        width: 76,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: ColorRes.white.withValues(alpha: 0.30),
        ),
        child: Center(
          child: Container(
            height: 66,
            width: 66,
            padding: const EdgeInsets.all(17),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: ColorRes.white.withValues(alpha: 0.50),
            ),
            child: ScaleTransition(
              scale: Tween(begin: 0.7, end: 1.0).animate(
                CurvedAnimation(parent: _controller, curve: Curves.easeOut),
              ),
              child: Image.asset(
                isLiked ? AssetRes.icFillFav : AssetRes.icFav,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ImageList extends StatelessWidget {
  final UserDetailScreenViewModel model;

  const _ImageList({required this.model});

  @override
  Widget build(BuildContext context) {
    final userData = model.otherUserData;
    return (userData?.images ?? []).isEmpty
        ? const SizedBox()
        : SizedBox(
            height: 60,
            child: ListView.builder(
              itemCount: (userData?.images ?? []).length,
              padding: const EdgeInsets.symmetric(horizontal: 20),
              scrollDirection: Axis.horizontal,
              shrinkWrap: true,
              itemBuilder: (context, index) {
                Images? image = (userData?.images ?? [])[index];
                bool isSelected = model.selectedImgIndex == index;
                return InkWell(
                  onTap: () => model.onImageSelect(index),
                  child: Container(
                    height: 60,
                    width: 60,
                    margin: const EdgeInsets.symmetric(horizontal: 5),
                    decoration: ShapeDecoration(
                      shape: SmoothRectangleBorder(
                          borderRadius: SmoothBorderRadius(
                              cornerRadius: 10, cornerSmoothing: 1),
                          side: BorderSide(
                              color: ColorRes.white
                                  .withValues(alpha: isSelected ? 0.80 : 0.2),
                              width: 2)),
                    ),
                    child: ClipSmoothRect(
                      radius: SmoothBorderRadius(
                          cornerRadius: 8, cornerSmoothing: 1),
                      child: CachedNetworkImage(
                        height: 60,
                        width: 60,
                        imageUrl: '${ConstRes.aImageBaseUrl}${image.image}',
                        cacheKey: '${ConstRes.aImageBaseUrl}${image.image}',
                        fit: BoxFit.cover,
                        errorWidget: (context, url, error) =>
                            CommonUI.profileImagePlaceHolder(
                                name: CommonUI.fullName(userData?.fullname)),
                      ),
                    ),
                  ),
                );
              },
            ),
          );
  }
}
