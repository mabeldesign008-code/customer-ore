import 'package:figma_squircle/figma_squircle.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/common/button/border_icon_button.dart';
import 'package:orange_ui/common/button/custom_text_button.dart';
import 'package:orange_ui/common/custom_border.dart';
import 'package:orange_ui/common/custom_text_field.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';

class BaseSelectSheet<T> extends StatelessWidget {
  final String title;
  final RxList<T> items;
  final Rx<T?> selectedItem;
  final String Function(T) getDisplayText;
  final String Function(T)? getSecondaryText;
  final Function(T) onSelect;
  final Function(String) onSearch;

  const BaseSelectSheet({
    super.key,
    required this.title,
    required this.items,
    required this.selectedItem,
    required this.getDisplayText,
    this.getSecondaryText,
    required this.onSelect,
    required this.onSearch,
  });

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: ClipSmoothRect(
        radius: const SmoothBorderRadius.vertical(
          top: SmoothRadius(cornerRadius: 30, cornerSmoothing: 1),
        ),
        child: Container(
          color: ColorRes.white,
          child: Column(
            children: [
              TopBarForSheet(title: title),
              _buildSearchField(
                  placeholder: S.of(context).searchHere, onChanged: onSearch),
              Expanded(
                child: Obx(() {
                  return ListView.builder(
                    itemCount: items.length,
                    padding: const EdgeInsets.only(top: 5),
                    itemBuilder: (context, index) {
                      final item = items[index];

                      return Obx(() {
                        final isSelected = selectedItem.value == item;
                        return _buildListItem(
                          item: item,
                          isSelected: isSelected,
                          onTap: () {
                            onSelect(item);
                          },
                          displayText: getDisplayText(item),
                          secondaryText: getSecondaryText?.call(item),
                          context: context,
                        );
                      });
                    },
                  );
                }),
              ),
              SafeArea(
                child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: CustomTextButton(
                      title: 'Save',
                      onTap: () {
                        Get.back();
                      },
                    )),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

Widget _buildListItem<T>({
  required T item,
  required bool isSelected,
  required VoidCallback onTap,
  required String displayText,
  String? secondaryText,
  required BuildContext context,
}) {
  return GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      margin: const EdgeInsets.only(bottom: 2, right: 15, left: 15),
      decoration: ShapeDecoration(
        color: isSelected
            ? ColorRes.themeColor.withValues(alpha: 0.2)
            : ColorRes.transparent,
        shape: SmoothRectangleBorder(
            borderRadius:
                SmoothBorderRadius(cornerRadius: 10, cornerSmoothing: 1),
            side: const BorderSide(color: ColorRes.borderColor)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              displayText,
              style: TextStyle(
                  fontFamily: FontRes.regular,
                  fontSize: 16,
                  color: isSelected ? ColorRes.themeColor : ColorRes.dimGrey2),
            ),
          ),
          const SizedBox(width: 20),
          if (secondaryText != null) ...[
            Text(secondaryText,
                style: TextStyle(
                    fontFamily: FontRes.regular,
                    fontSize: 16,
                    color:
                        isSelected ? ColorRes.themeColor : ColorRes.darkGrey5)),
          ],
        ],
      ),
    ),
  );
}

Widget _buildSearchField(
    {required String placeholder, required Function(String) onChanged}) {
  return Padding(
    padding: const EdgeInsets.symmetric(vertical: 3, horizontal: 15),
    child: CustomTextField(
      onChanged: onChanged,
      title: placeholder,
    ),
  );
}

class TopBarForSheet extends StatelessWidget {
  final String title;

  const TopBarForSheet({super.key, required this.title});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 20.0, horizontal: 15),
      child: Column(
        spacing: 15,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const SizedBox(width: 30),
              Text(
                title.tr,
                style: const TextStyle(
                    fontFamily: FontRes.semiBold,
                    fontSize: 18,
                    color: ColorRes.davyGrey),
              ),
              BorderIconButton(
                  onTap: Get.back,
                  icon: AssetRes.icClose,
                  border: Border.all(color: ColorRes.borderColor),
                  color: ColorRes.dimGrey3,
                  height: 30,
                  width: 30)
            ],
          ),
          const CustomBorder(),
        ],
      ),
    );
  }
}
