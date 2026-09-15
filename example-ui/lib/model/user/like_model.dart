class LikeModel {
  LikeModel({
    this.status,
    this.message,
    this.data,
  });

  LikeModel.fromJson(dynamic json) {
    status = json['status'];
    message = json['message'];
    data = json['data'] != null ? LikeData.fromJson(json['data']) : null;
  }

  bool? status;
  String? message;
  LikeData? data;

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    map['status'] = status;
    map['message'] = message;
    if (data != null) {
      map['data'] = data?.toJson();
    }
    return map;
  }
}

class LikeData {
  LikeData({
    this.myUserId,
    this.userId,
    this.updatedAt,
    this.createdAt,
    this.id,
  });

  LikeData.fromJson(dynamic json) {
    myUserId = json['my_user_id'];
    userId = json['user_id'];
    updatedAt = json['updated_at'];
    createdAt = json['created_at'];
    id = json['id'];
  }

  num? myUserId;
  num? userId;
  String? updatedAt;
  String? createdAt;
  num? id;

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    map['my_user_id'] = myUserId;
    map['user_id'] = userId;
    map['updated_at'] = updatedAt;
    map['created_at'] = createdAt;
    map['id'] = id;
    return map;
  }
}
