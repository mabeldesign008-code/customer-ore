import 'package:figma_squircle/figma_squircle.dart';
import 'package:flutter/material.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';

class CustomDropDownBtn<T> extends StatelessWidget {
  final List<T> items;
  final T selectedValue;
  final Function(T?)? onChanged;
  final double height;
  final double? width;
  final bool isExpanded;
  final EdgeInsetsGeometry? padding;
  final TextStyle? style;
  final double? menuMaxHeight;
  final String Function(T) getTitle; // Function to extract title
  final double? radius;
  final Color? bgColor;

  const CustomDropDownBtn({
    super.key,
    required this.items,
    required this.selectedValue,
    required this.onChanged,
    required this.getTitle,
    this.height = 37,
    this.width,
    this.isExpanded = false,
    this.padding,
    this.style,
    this.menuMaxHeight,
    this.bgColor,
    this.radius,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      width: width,
      padding: const EdgeInsets.symmetric(horizontal: 10),
      decoration: ShapeDecoration(
        color: bgColor,
        shape: SmoothRectangleBorder(
          borderRadius:
              SmoothBorderRadius(cornerRadius: radius ?? 5, cornerSmoothing: 1),
        ),
      ),
      alignment: Alignment.center,
      child: DropdownButton<T>(
        value: selectedValue,
        icon: Align(
            alignment: Alignment.bottomCenter,
            child: Image.asset(
              AssetRes.downArrow,
              width: 23,
              height: 20,
              color: ColorRes.themeColor,
            )),
        dropdownColor: bgColor,
        style: style,
        underline: const SizedBox(),
        isDense: true,
        isExpanded: isExpanded,
        padding: padding,
        alignment: Alignment.center,
        onChanged: onChanged,
        menuMaxHeight: menuMaxHeight ?? 120,
        borderRadius: SmoothBorderRadius(cornerRadius: 10, cornerSmoothing: 1),
        items: items.map<DropdownMenuItem<T>>((T item) {
          return DropdownMenuItem<T>(
            value: item,
            child: Text(getTitle(item), style: style),
          );
        }).toList(),
      ),
    );
  }
}
