import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:orange_ui/common/common_ui.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/fetch_redeem_request.dart';
import 'package:orange_ui/model/setting_model.dart';
import 'package:orange_ui/utils/app_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';

class CenterAreaRedeemScreen extends StatelessWidget {
  final List<RedeemRequestData>? redeemData;
  final Appdata? settingAppData;

  const CenterAreaRedeemScreen(
      {super.key, this.redeemData, this.settingAppData});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: redeemData!.isEmpty
          ? CommonUI.noData(title: S.current.noRedeemData)
          : SafeArea(
              top: false,
              child: ListView.builder(
                itemCount: redeemData?.length,
                padding: EdgeInsets.zero,
                itemBuilder: (context, index) {
                  RedeemRequestData? data = redeemData?[index];
                  return Container(
                    width: Get.width,
                    margin: const EdgeInsets.only(left: 7, right: 7, bottom: 5),
                    padding: const EdgeInsets.only(top: 10, left: 11, bottom: 11, right: 13),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(8),
                      color: ColorRes.borderColor,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.start,
                          children: [
                            Text(
                              '${data?.requestId}',
                              style: const TextStyle(
                                fontSize: 14,
                                fontFamily: FontRes.semiBold,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.fromLTRB(16, 5, 13, 4),
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(30),
                                color: data?.status == 0
                                    ? ColorRes.lightOrange.withValues(alpha: 0.20)
                                    : ColorRes.lightGreen.withValues(alpha: 0.22),
                              ),
                              child: Center(
                                child: Text(
                                  data?.status == 0 ? S.current.processing : S.current.complete,
                                  style: TextStyle(
                                    color: data?.status == 0 ? ColorRes.lightOrange : ColorRes.green2,
                                    fontSize: 12,
                                    fontFamily: FontRes.semiBold,
                                  ),
                                ),
                              ),
                            ),
                            const Spacer(),
                            Text(
                              DateFormat(AppRes.dMY).format(DateTime.parse('${data?.createdAt}')),
                              style: const TextStyle(
                                fontSize: 14,
                                color: ColorRes.grey19,
                              ),
                            )
                          ],
                        ),
                        const SizedBox(height: 7),
                        Row(
                          children: [
                            Text(
                              AppRes.planName,
                              style: const TextStyle(color: ColorRes.grey19, fontSize: 14, fontFamily: FontRes.regular),
                            ),
                            Text(
                              ': ${data?.coinAmount}',
                              style: const TextStyle(
                                color: ColorRes.grey28,
                                fontSize: 14,
                                fontFamily: FontRes.semiBold,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Visibility(
                          visible: data?.status == 0 ? false : true,
                          child: Row(
                            children: [
                              Text(
                                S.current.amount,
                                style: const TextStyle(color: ColorRes.grey19, fontSize: 14),
                              ),
                              Text(
                                ' ${settingAppData?.currency}${data?.amountPaid}',
                                style: const TextStyle(
                                  fontSize: 14,
                                  color: ColorRes.grey28,
                                  fontFamily: FontRes.semiBold,
                                ),
                              )
                            ],
                          ),
                        )
                      ],
                    ),
                  );
                },
              ),
            ),
    );
  }
}
