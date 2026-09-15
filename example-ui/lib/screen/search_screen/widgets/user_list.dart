import 'package:flutter/material.dart';
import 'package:orange_ui/common/custom_image.dart';
import 'package:orange_ui/common/fullname_with_age.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';

class UserList extends StatelessWidget {
  final List<UserData>? userList;
  final Function(UserData? data) onUserTap;
  final ScrollController controller;

  const UserList(
      {super.key,
      required this.userList,
      required this.onUserTap,
      required this.controller});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: ListView.builder(
        controller: controller,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        itemCount: userList?.length,
        itemBuilder: (context, index) {
          UserData? userData = userList?[index];
          return InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: () => onUserTap(userList?[index]),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 10),
              margin: const EdgeInsets.only(bottom: 5),
              decoration: BoxDecoration(
                  color: ColorRes.lightGrey2,
                  borderRadius: BorderRadius.circular(12)),
              child: Row(
                children: [
                  CustomImage(
                    image: userData?.profileImage,
                    width: 40,
                    height: 40,
                    fullname: userData?.fullname,
                    radius: 30,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        FullnameWithAge(
                          userData: userList?[index],
                          fontColor: ColorRes.darkGrey,
                          fontSize: 18,
                          fontFamily: FontRes.bold,
                          iconSize: 19,
                        ),
                        Text(
                          userList?[index].address ?? '',
                          style: const TextStyle(
                              color: ColorRes.darkGrey9,
                              fontSize: 13,
                              overflow: TextOverflow.ellipsis),
                          maxLines: 1,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
