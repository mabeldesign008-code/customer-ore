import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/utils/app_res.dart';
import 'package:orange_ui/utils/color_res.dart';

class DropDownBox extends StatelessWidget {
  final String gender;
  final Function(String value) onChange;

  const DropDownBox({super.key, required this.gender, required this.onChange});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 100,
      padding: const EdgeInsets.symmetric(horizontal: 20),
      decoration: BoxDecoration(color: ColorRes.white, boxShadow: [
        BoxShadow(
          color: ColorRes.grey2.withValues(alpha: 0.35),
          offset: const Offset(0, 2),
          blurRadius: 3,
        ),
        BoxShadow(
          color: ColorRes.grey2.withValues(alpha: 0.35),
          offset: const Offset(2, 0),
          blurRadius: 3,
        ),
      ]),
      child: Row(
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              InkWell(
                onTap: () {
                  onChange(AppRes.male);
                },
                child: Container(
                  height: 30,
                  width: Get.width - 80,
                  alignment: Alignment.centerLeft,
                  child: Text(
                    AppRes.male,
                    style: TextStyle(
                      color: gender == AppRes.male
                          ? ColorRes.themeColor
                          : ColorRes.grey,
                    ),
                  ),
                ),
              ),
              InkWell(
                onTap: () {
                  onChange(AppRes.female);
                },
                child: Container(
                  height: 30,
                  width: Get.width - 80,
                  alignment: Alignment.centerLeft,
                  child: Text(
                    AppRes.female,
                    style: TextStyle(
                      color: gender == AppRes.female
                          ? ColorRes.themeColor
                          : ColorRes.grey,
                    ),
                  ),
                ),
              ),
              InkWell(
                onTap: () {
                  onChange(AppRes.other);
                },
                child: Container(
                  height: 30,
                  width: Get.width - 80,
                  alignment: Alignment.centerLeft,
                  child: Text(
                    AppRes.other,
                    style: TextStyle(
                      color: gender == AppRes.other
                          ? ColorRes.themeColor
                          : ColorRes.grey,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
