import 'package:flutter/material.dart';
import 'package:orange_ui/common/common_ui.dart';
import 'package:orange_ui/common/top_bar_area.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/screen/notification_screen/widgets/admin_notificaiton_page.dart';
import 'package:orange_ui/screen/notification_screen/widgets/personal_notification.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';
import 'package:stacked/stacked.dart';
import 'notification_screen_view_model.dart';

class NotificationScreen extends StatelessWidget {
  const NotificationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ViewModelBuilder<NotificationScreenViewModel>.reactive(
      viewModelBuilder: () => NotificationScreenViewModel(),
      onViewModelReady: (model) => model.init(),
      builder: (context, model, child) {
        return Scaffold(
          body: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TopBarArea(title2: S.current.notification),
              const SizedBox(height: 11),
              _buildTabBar(model),
              const SizedBox(height: 8),
              Expanded(child: _buildContent(model)),
            ],
          ),
        );
      },
    );
  }

  Widget _buildTabBar(NotificationScreenViewModel model) {
    return Container(
      height: 50,
      width: 254,
      padding: const EdgeInsets.all(5),
      margin: const EdgeInsets.only(left: 16),
      decoration: BoxDecoration(
        color: ColorRes.aquaHaze,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          _buildTabItem(
            title: S.current.personal,
            isSelected: model.tabIndex == 0,
            onTap: () => model.onTabChange(0),
            width: 132,
          ),
          _buildTabItem(
            title: S.current.platform,
            isSelected: model.tabIndex == 1,
            onTap: () => model.onTabChange(1),
            width: 112,
          ),
        ],
      ),
    );
  }

  Widget _buildTabItem({
    required String title,
    required bool isSelected,
    required VoidCallback onTap,
    required double width,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        height: 40,
        width: width,
        decoration: BoxDecoration(
          color: isSelected ? ColorRes.darkGrey : ColorRes.aquaHaze,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Center(
          child: Text(
            title,
            style: TextStyle(
              color: isSelected ? ColorRes.white : ColorRes.darkGrey,
              fontFamily: FontRes.regular,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildContent(NotificationScreenViewModel model) {
    if (model.isLoading) {
      return CommonUI.lottieWidget();
    }

    if (model.tabIndex == 0) {
      // Personal notifications
      return model.isUserLoading
          ? CommonUI.lottieWidget()
          : PersonalNotificationPage(
              userNotification: model.userNotification,
              controller: model.userScrollController,
              onUserTap: model.onUserTap,
            );
    } else {
      // Platform/admin notifications
      return AdminNotificationPage(
        adminNotification: model.adminNotification,
        controller: model.adminScrollController,
      );
    }
  }
}
