import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/common/common_fun.dart';
import 'package:orange_ui/common/common_ui.dart';
import 'package:orange_ui/model/notification/admin_notification.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';
import 'package:orange_ui/utils/style_res.dart';

class AdminNotificationPage extends StatelessWidget {
  final List<AdminNotificationData> adminNotification;
  final ScrollController controller;

  const AdminNotificationPage(
      {super.key, required this.adminNotification, required this.controller});

  @override
  Widget build(BuildContext context) {
    return adminNotification.isEmpty
        ? CommonUI.noData()
        : ListView.builder(
            controller: controller,
            padding: const EdgeInsets.only(top: 15),
            itemCount: adminNotification.length,
            itemBuilder: (context, index) {
              AdminNotificationData adminData = adminNotification[index];
              return Container(
                margin: const EdgeInsets.only(left: 16, right: 19, bottom: 18),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      height: 40,
                      width: 40,
                      decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: StyleRes.linearGradient),
                    ),
                    const SizedBox(width: 13),
                    SizedBox(
                      width: Get.width - 94,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  '${adminData.title}',
                                  style: const TextStyle(
                                    fontFamily: FontRes.bold,
                                    fontSize: 15,
                                    color: ColorRes.darkGrey,
                                  ),
                                ),
                              ),
                              Text(
                                CommonFun.timeAgo(
                                    DateTime.parse('${adminData.createdAt}')),
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: ColorRes.grey2,
                                ),
                              ),
                            ],
                          ),
                          Text(
                            '${adminData.message}',
                            style: const TextStyle(
                              fontSize: 13,
                              color: ColorRes.darkGrey9,
                            ),
                          )
                        ],
                      ),
                    )
                  ],
                ),
              );
            },
          );
  }
}
