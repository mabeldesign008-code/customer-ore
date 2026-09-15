import 'package:flutter/material.dart';
import 'package:orange_ui/common/custom_border.dart';
import 'package:orange_ui/common/dashboard_top_bar.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/screen/dashboard/dashboard_screen_view_model.dart';
import 'package:orange_ui/screen/dashboard/widget/custom_banner_ads.dart';
import 'package:orange_ui/screen/explore_screen/explore_screen.dart';
import 'package:orange_ui/screen/feed_screen/feed_screen.dart';
import 'package:orange_ui/screen/find_match_profile/find_match_profile.dart';
import 'package:orange_ui/screen/message_screen/message_screen.dart';
import 'package:orange_ui/screen/profile_screen/profile_screen.dart';
import 'package:orange_ui/service/session_manager.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';
import 'package:stacked/stacked.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ViewModelBuilder<DashboardScreenViewModel>.reactive(
      onViewModelReady: (model) => model.init(),
      viewModelBuilder: () => DashboardScreenViewModel(),
      builder: (context, model, child) {
        bool isDating = model.settingAppData?.isDating == 1;
        bool isSocialMedia = model.settingAppData?.isSocialMedia == 1;
        return Scaffold(
          backgroundColor: ColorRes.white,
          bottomNavigationBar: BottomNavigationView(model: model),
          body: SafeArea(
            bottom: false,
            child: Column(
              children: [
                DashboardTopBar(
                  onNotificationTap: model.onNotificationTap,
                  onSearchTap: model.onSearchTap,
                  onLivesBtnClick: model.onLivesBtnClick,
                  isDating: model.settingAppData?.isDating,
                ),
                Expanded(
                  child: _getCurrentPage(
                    isSocialMedia: isSocialMedia,
                    isDating: isDating,
                    index: model.pageIndex,
                  ),
                ),
                (SessionManager.instance.isDating && model.pageIndex == 1)
                    ? const SizedBox()
                    : const CustomBannerAds(),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _getCurrentPage(
      {required bool isSocialMedia,
      required bool isDating,
      required int index}) {
    if (!isDating && !isSocialMedia) {
      switch (index) {
        case 0:
          return const MessageScreen();
        default:
          return const ProfileScreen();
      }
    } else if (isDating && isSocialMedia) {
      switch (index) {
        case 0:
          return const ExploreScreen();
        case 1:
          return const FindMatchProfile();
        case 2:
          return const FeedScreen();
        case 3:
          return const MessageScreen();
        default:
          return const ProfileScreen();
      }
    } else if (!isDating && isSocialMedia) {
      // Social media only
      switch (index) {
        case 0:
          return const FeedScreen();
        case 1:
          return const MessageScreen();
        default:
          return const ProfileScreen();
      }
    } else {
      // Dating only
      switch (index) {
        case 0:
          return const ExploreScreen();
        case 1:
          return const FindMatchProfile();
        case 2:
          return const MessageScreen();
        default:
          return const ProfileScreen();
      }
    }
  }
}

class BottomNavigationView extends StatelessWidget {
  final DashboardScreenViewModel model;

  const BottomNavigationView({super.key, required this.model});

  @override
  Widget build(BuildContext context) {
    bool isDating = model.settingAppData?.isDating == 1;
    bool isSocialMedia = model.settingAppData?.isSocialMedia == 1;
    List<ImageText> navList = [];

    if (!isDating && !isSocialMedia) {
      // Both off
      navList = [
        ImageText(AssetRes.icMessage, S.current.message),
        ImageText(AssetRes.icProfile, S.current.profile),
      ];
    } else if (isDating && isSocialMedia) {
      // Both on
      navList = [
        ImageText(AssetRes.icExplore, S.current.explore),
        ImageText(AssetRes.icMatch, S.current.findMatch),
        ImageText(AssetRes.icFeed, S.current.feed),
        ImageText(AssetRes.icMessage, S.current.message),
        ImageText(AssetRes.icProfile, S.current.profile),
      ];
    } else if (!isDating && isSocialMedia) {
      // Social media only
      navList = [
        ImageText(AssetRes.icFeed, S.current.feed),
        ImageText(AssetRes.icMessage, S.current.message),
        ImageText(AssetRes.icProfile, S.current.profile),
      ];
    } else if (isDating && !isSocialMedia) {
      // Dating only
      navList = [
        ImageText(AssetRes.icExplore, S.current.explore),
        ImageText(AssetRes.icMatch, S.current.findMatch),
        ImageText(AssetRes.icMessage, S.current.message),
        ImageText(AssetRes.icProfile, S.current.profile),
      ];
    }
    return SafeArea(
      top: false,
      child: SizedBox(
        height: 60,
        child: Column(
          spacing: 5,
          children: [
            const CustomBorder(),
            Row(
              children: List.generate(navList.length, (index) {
                final item = navList[index];
                final isSelected = index == model.pageIndex;
                final color =
                    isSelected ? ColorRes.themeColor : ColorRes.dimGrey6;
                return Expanded(
                  child: InkWell(
                    onTap: () => model.onBottomBarTap(index),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        Image.asset(item.image,
                            width: 25, height: 25, color: color),
                        const SizedBox(height: 5),
                        Text(
                          item.title,
                          style: TextStyle(
                            fontSize: 12,
                            color: color,
                            fontFamily: FontRes.medium,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }),
            ),
          ],
        ),
      ),
    );
  }
}
