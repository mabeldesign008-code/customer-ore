import 'package:flutter/material.dart';
import 'package:orange_ui/common/common_ui.dart';
import 'package:orange_ui/screen/dashboard/widget/custom_banner_ads.dart';
import 'package:orange_ui/screen/live_grid_screen/live_grid_screen_view_model.dart';
import 'package:orange_ui/screen/live_grid_screen/widgets/custom_grid_view.dart';
import 'package:orange_ui/screen/live_grid_screen/widgets/live_grid_top_area.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:stacked/stacked.dart';

class LiveGridScreen extends StatelessWidget {
  const LiveGridScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ViewModelBuilder<LiveGridScreenViewModel>.reactive(
      onViewModelReady: (model) {
        model.init();
      },
      viewModelBuilder: () => LiveGridScreenViewModel(),
      builder: (context, model, child) {
        return Scaffold(
          backgroundColor: ColorRes.white,
          body: Column(
            children: [
              LiveGridTopArea(
                onBackBtnTap: model.onBackBtnTap,
                onGoLiveTap: model.goLiveBtnClick,
                userData: model.userData,
              ),
              if (!model.isLoading)
                CustomGridView(
                  userData: model.liveStreamUsers,
                  onImageTap: model.onLiveStreamProfileTap,
                )
              else
                Expanded(
                  child: CommonUI.lottieWidget(),
                ),
              const SizedBox(height: 10),
              const CustomBannerAds(),
            ],
          ),
        );
      },
    );
  }
}
