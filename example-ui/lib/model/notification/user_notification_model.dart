// To parse this JSON data, do
//
//     final userNotificationModel = userNotificationModelFromJson(jsonString);

import 'dart:convert';

import 'package:orange_ui/model/user/registration_user.dart';

UserNotificationModel userNotificationModelFromJson(String str) =>
    UserNotificationModel.fromJson(json.decode(str));

String userNotificationModelToJson(UserNotificationModel data) =>
    json.encode(data.toJson());

class UserNotificationModel {
  bool? status;
  String? message;
  List<UserNotificationData>? data;

  UserNotificationModel({
    this.status,
    this.message,
    this.data,
  });

  factory UserNotificationModel.fromJson(Map<String, dynamic> json) =>
      UserNotificationModel(
        status: json["status"],
        message: json["message"],
        data: json["data"] == null
            ? []
            : List<UserNotificationData>.from(
                json["data"]!.map((x) => UserNotificationData.fromJson(x))),
      );

  Map<String, dynamic> toJson() => {
        "status": status,
        "message": message,
        "data": data == null
            ? []
            : List<dynamic>.from(data!.map((x) => x.toJson())),
      };
}

class UserNotificationData {
  int? id;
  int? myUserId;
  int? userId;
  int? itemId;
  int? type;
  DateTime? createdAt;
  DateTime? updatedAt;
  UserData? user;

  UserNotificationData({
    this.id,
    this.myUserId,
    this.userId,
    this.itemId,
    this.type,
    this.createdAt,
    this.updatedAt,
    this.user,
  });

  factory UserNotificationData.fromJson(Map<String, dynamic> json) =>
      UserNotificationData(
        id: json["id"],
        myUserId: json["my_user_id"],
        userId: json["user_id"],
        itemId: json["item_id"],
        type: json["type"],
        createdAt: json["created_at"] == null
            ? null
            : DateTime.parse(json["created_at"]),
        updatedAt: json["updated_at"] == null
            ? null
            : DateTime.parse(json["updated_at"]),
        user: json["user"] == null ? null : UserData.fromJson(json["user"]),
      );

  Map<String, dynamic> toJson() => {
        "id": id,
        "my_user_id": myUserId,
        "user_id": userId,
        "item_id": itemId,
        "type": type,
        "created_at": createdAt?.toIso8601String(),
        "updated_at": updatedAt?.toIso8601String(),
        "user": user?.toJson(),
      };
}
