import 'package:flutter/material.dart';
import 'package:orange_ui/common/common_ui.dart';
import 'package:orange_ui/screen/dashboard/widget/custom_banner_ads.dart';
import 'package:orange_ui/screen/search_screen/search_screen_view_model.dart';
import 'package:orange_ui/screen/search_screen/widgets/search_bar_area.dart';
import 'package:orange_ui/screen/search_screen/widgets/user_list.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:stacked/stacked.dart';

class SearchScreen extends StatelessWidget {
  const SearchScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ViewModelBuilder<SearchScreenViewModel>.reactive(
      onViewModelReady: (model) {
        model.init();
      },
      viewModelBuilder: () => SearchScreenViewModel(),
      builder: (context, model, child) {
        return Scaffold(
          backgroundColor: ColorRes.white,
          body: Column(
            children: [
              SearchBarArea(
                searchController: model.searchController,
                selectedTab: model.selectedTab,
                tabList: model.tabList,
                onBackBtnTap: model.onBackBtnTap,
                onSearchBtnTap: model.onSearchingUser,
                onLocationTap: model.onLocationTap,
                onTabSelect: model.onTabSelect,
                viewModel: model,
              ),
              const SizedBox(height: 11),
              model.isLoading && model.searchUsers.isEmpty
                  ? Expanded(child: CommonUI.lottieWidget())
                  : UserList(
                      controller: model.scrollController,
                      userList: model.searchUsers,
                      onUserTap: model.onUserTap,
                    ),
              const SizedBox(height: 10),
              const CustomBannerAds()
            ],
          ),
        );
      },
    );
  }
}
