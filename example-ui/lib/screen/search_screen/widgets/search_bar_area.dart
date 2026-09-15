import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/common/button/round_icon_button.dart';
import 'package:orange_ui/common/custom_text_field.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/setting_model.dart';
import 'package:orange_ui/screen/search_screen/search_screen_view_model.dart';
import 'package:orange_ui/service/session_manager.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';

class SearchBarArea extends StatelessWidget {
  final TextEditingController searchController;
  final String selectedTab;
  final List<Interests> tabList;
  final VoidCallback onBackBtnTap;
  final Function(String value)? onSearchBtnTap;
  final VoidCallback onLocationTap;
  final Function(Interests value) onTabSelect;
  final SearchScreenViewModel viewModel;

  const SearchBarArea({
    super.key,
    required this.searchController,
    required this.selectedTab,
    required this.tabList,
    required this.onBackBtnTap,
    required this.onSearchBtnTap,
    required this.onLocationTap,
    required this.onTabSelect,
    required this.viewModel,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(color: ColorRes.white),
      child: selectedTab == '' ? withoutSelected() : withSelected(),
    );
  }

  Widget withoutSelected() {
    bool isDating = SessionManager.instance.isDating;
    return Column(
      spacing: 15,
      children: [
        SafeArea(
          bottom: false,
          child: Row(
            spacing: 5,
            children: [
              const SizedBox(width: 1),
              RoundIconButton(onTap: onBackBtnTap, icon: AssetRes.backArrow),
              Expanded(
                  child: CustomTextField(
                      hintText: S.current.searching,
                      controller: searchController,
                      onChanged: onSearchBtnTap)),
              if (isDating)
                RoundIconButton(
                    onTap: viewModel.onFilterTap, icon: AssetRes.icRandom),
              RoundIconButton(
                  onTap: onLocationTap, icon: AssetRes.locationSearch),
              const SizedBox(width: 1),
            ],
          ),
        ),
        if (tabList.isNotEmpty)
          SizedBox(
            height: 35,
            width: Get.width,
            child: ListView.builder(
              itemCount: tabList.length,
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              itemBuilder: (context, index) {
                return InkWell(
                  onTap: () {
                    onTabSelect(tabList[index]);
                  },
                  child: Container(
                    height: 35,
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    margin: const EdgeInsets.symmetric(horizontal: 3),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(50),
                      color: ColorRes.themeColor.withValues(alpha: 0.06),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      tabList[index].title ?? '',
                      style: const TextStyle(
                          color: ColorRes.themeColor, fontFamily: FontRes.bold),
                    ),
                  ),
                );
              },
            ),
          ),
      ],
    );
  }

  Widget withSelected() {
    return Column(
      children: [
        Container(
          width: Get.width,
          padding: const EdgeInsets.symmetric(horizontal: 10),
          color: ColorRes.themeColor.withValues(alpha: 0.06),
          child: SafeArea(
            bottom: false,
            minimum: const EdgeInsets.symmetric(vertical: 10),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                RoundIconButton(onTap: onBackBtnTap, icon: AssetRes.backArrow),
                Flexible(
                  child: Text(
                    selectedTab,
                    style: const TextStyle(
                      color: ColorRes.themeColor,
                      fontSize: 18,
                      fontFamily: FontRes.bold,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 37),
              ],
            ),
          ),
        ),
        Container(
            margin: const EdgeInsets.all(10),
            child: CustomTextField(
                hintText: S.current.searching, onChanged: onSearchBtnTap)),
      ],
    );
  }
}
