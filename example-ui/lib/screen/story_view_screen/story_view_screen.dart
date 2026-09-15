import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:orange_ui/common/common_fun.dart';
import 'package:orange_ui/common/common_ui.dart';
import 'package:orange_ui/common/custom_image.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/screen/story_view_screen/story_view_screen_view_model.dart';
import 'package:orange_ui/service/session_manager.dart';
import 'package:orange_ui/story_view/widgets/story_view.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';
import 'package:stacked/stacked.dart';

class StoryViewScreen extends StatelessWidget {
  final List<UserData> stories;
  final int userIndex;

  const StoryViewScreen(
      {super.key, required this.stories, required this.userIndex});

  @override
  Widget build(BuildContext context) {
    return ViewModelBuilder<StoryViewScreenViewModel>.reactive(
      onViewModelReady: (viewModel) => viewModel.init(),
      viewModelBuilder: () => StoryViewScreenViewModel(
          stories, userIndex, PageController(initialPage: userIndex)),
      builder: (context, model, child) {
        return SafeArea(
          bottom: false,
          child: Container(
            margin: EdgeInsets.only(top: AppBar().preferredSize.height),
            child: PageView.builder(
              controller: model.pageController,
              itemCount: stories.length,
              onPageChanged: model.onPageChange,
              itemBuilder: (context, storyIndex) {
                return StoryView(
                  storyItems: model.stories[storyIndex],
                  inline: true,
                  onStoryShow: model.onStoryShow,
                  onBack: model.onPreviousUser,
                  onComplete: model.onNext,
                  progressPosition: ProgressPosition.top,
                  repeat: false,
                  controller: model.storyController,
                  overlayWidget: (item) {
                    return Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 15, vertical: 20),
                      child: Row(
                        children: [
                          CustomImage(
                              image: item.story?.user?.profileImage,
                              fullname: item.story?.user?.fullname,
                              height: 35,
                              width: 35,
                              radius: 30),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Row(
                              children: [
                                Flexible(
                                    child: Text(
                                        CommonUI.fullName(
                                            item.story?.user?.fullname),
                                        style: const TextStyle(
                                            fontFamily: FontRes.bold,
                                            color: ColorRes.white,
                                            fontSize: 15),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis)),
                                const SizedBox(width: 8),
                                Container(
                                  width: 4,
                                  height: 4,
                                  color: ColorRes.white.withValues(alpha: 0.7),
                                ),
                                const SizedBox(width: 4),
                                Text(
                                    CommonFun.timeAgo(
                                        item.story?.date ?? DateTime.now()),
                                    style: const TextStyle(
                                        fontFamily: FontRes.regular,
                                        fontSize: 13,
                                        color: ColorRes.white)),
                              ],
                            ),
                          ),
                          if ((item.story?.viewByUserIds?.split(',').length ??
                                  0) >
                              0)
                            Container(
                              margin: const EdgeInsets.symmetric(horizontal: 5),
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 5),
                              decoration: ShapeDecoration(
                                  shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(30)),
                                  color: ColorRes.white),
                              child: Row(
                                children: [
                                  Image.asset(AssetRes.icEyeBlack, width: 16),
                                  Text(
                                    ' ${NumberFormat.compact().format(item.story?.viewByUserIds?.split(',').length ?? 0)}',
                                    style: const TextStyle(
                                        fontFamily: FontRes.medium,
                                        fontSize: 12,
                                        color: ColorRes.black),
                                  )
                                ],
                              ),
                            ),
                          if (item.story?.user?.id ==
                              SessionManager.instance.getUserID())
                            PopupMenuButton(
                              onSelected: (value) {
                                model.onStoryDelete(item.story);
                              },
                              onOpened: () {
                                model.storyController.pause();
                              },
                              padding: EdgeInsets.zero,
                              itemBuilder: (context) {
                                return <PopupMenuEntry>[
                                  PopupMenuItem(
                                    value: 'Delete',
                                    height: 30,
                                    child: Center(
                                      child: Text(
                                        S.of(context).delete,
                                        style: const TextStyle(
                                            fontFamily: FontRes.medium,
                                            fontSize: 15,
                                            color: ColorRes.themeColor),
                                      ),
                                    ),
                                  ),
                                ];
                              },
                              shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(6),
                                  side: const BorderSide(
                                      color: ColorRes.borderColor)),
                              surfaceTintColor: ColorRes.white,
                              color: ColorRes.white,
                              position: PopupMenuPosition.under,
                              child: Image.asset(AssetRes.icHorizontalThreeDot,
                                  height: 20, width: 20, color: ColorRes.white),
                            )
                        ],
                      ),
                    );
                  },
                );
              },
            ),
          ),
        );
      },
    );
  }
}
