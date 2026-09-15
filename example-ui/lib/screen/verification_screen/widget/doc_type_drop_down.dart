import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/utils/color_res.dart';

class DocTypeDropDown extends StatelessWidget {
  final String docType;
  final Function(String value) onChange;

  const DocTypeDropDown({
    super.key,
    required this.docType,
    required this.onChange,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 100,
      width: Get.width,
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
                  onChange(S.current.drivingLicence);
                },
                child: Container(
                  height: 30,
                  width: Get.width - 80,
                  alignment: Alignment.centerLeft,
                  child: Text(
                    S.current.drivingLicence,
                    style: TextStyle(
                      color: docType == S.current.drivingLicence
                          ? ColorRes.themeColor
                          : ColorRes.grey,
                    ),
                  ),
                ),
              ),
              InkWell(
                onTap: () {
                  onChange(S.current.idCard);
                },
                child: Container(
                  height: 30,
                  width: Get.width - 80,
                  alignment: Alignment.centerLeft,
                  child: Text(
                    S.current.idCard,
                    style: TextStyle(
                      color: docType == S.current.idCard
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
