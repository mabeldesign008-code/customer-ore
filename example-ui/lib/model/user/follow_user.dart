import 'package:orange_ui/model/user/registration_user.dart';

class FollowUser {
  FollowUser({
    bool? status,
    String? message,
    Data? data,
  }) {
    _status = status;
    _message = message;
    _data = data;
  }

  FollowUser.fromJson(dynamic json) {
    _status = json['status'];
    _message = json['message'];
    _data = json['data'] != null ? Data.fromJson(json['data']) : null;
  }
  bool? _status;
  String? _message;
  Data? _data;

  bool? get status => _status;
  String? get message => _message;
  Data? get data => _data;

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    map['status'] = _status;
    map['message'] = _message;
    if (_data != null) {
      map['data'] = _data?.toJson();
    }
    return map;
  }
}

class Data {
  Data({
    int? myUserId,
    int? userId,
    String? updatedAt,
    String? createdAt,
    int? id,
    UserData? user,
  }) {
    _myUserId = myUserId;
    _userId = userId;
    _updatedAt = updatedAt;
    _createdAt = createdAt;
    _id = id;
    _user = user;
  }

  Data.fromJson(dynamic json) {
    _myUserId = json['my_user_id'];
    _userId = json['user_id'];
    _updatedAt = json['updated_at'];
    _createdAt = json['created_at'];
    _id = json['id'];
    _user = json['user'] != null ? UserData.fromJson(json['user']) : null;
  }
  int? _myUserId;
  int? _userId;
  String? _updatedAt;
  String? _createdAt;
  int? _id;
  UserData? _user;

  int? get myUserId => _myUserId;
  int? get userId => _userId;
  String? get updatedAt => _updatedAt;
  String? get createdAt => _createdAt;
  int? get id => _id;

  UserData? get user => _user;

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    map['my_user_id'] = _myUserId;
    map['user_id'] = _userId;
    map['updated_at'] = _updatedAt;
    map['created_at'] = _createdAt;
    map['id'] = _id;
    if (_user != null) {
      map['user'] = _user?.toJson();
    }
    return map;
  }
}
