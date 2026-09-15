import 'package:orange_ui/model/user/registration_user.dart';

class FetchComment {
  FetchComment({
    bool? status,
    String? message,
    List<CommentData>? data,
  }) {
    _status = status;
    _message = message;
    _data = data;
  }

  FetchComment.fromJson(dynamic json) {
    _status = json['status'];
    _message = json['message'];
    if (json['data'] != null) {
      _data = [];
      json['data'].forEach((v) {
        _data?.add(CommentData.fromJson(v));
      });
    }
  }
  bool? _status;
  String? _message;
  List<CommentData>? _data;

  bool? get status => _status;
  String? get message => _message;
  List<CommentData>? get data => _data;

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    map['status'] = _status;
    map['message'] = _message;
    if (_data != null) {
      map['data'] = _data?.map((v) => v.toJson()).toList();
    }
    return map;
  }
}

class CommentData {
  CommentData({
    int? id,
    int? userId,
    int? postId,
    String? description,
    String? createdAt,
    String? updatedAt,
    UserData? user,
  }) {
    _id = id;
    _userId = userId;
    _postId = postId;
    _description = description;
    _createdAt = createdAt;
    _updatedAt = updatedAt;
    _user = user;
  }

  CommentData.fromJson(dynamic json) {
    _id = json['id'];
    _userId = json['user_id'];
    _postId = json['post_id'];
    _description = json['description'];
    _createdAt = json['created_at'];
    _updatedAt = json['updated_at'];
    _user = json['user'] != null ? UserData.fromJson(json['user']) : null;
  }
  int? _id;
  int? _userId;
  int? _postId;
  String? _description;
  String? _createdAt;
  String? _updatedAt;
  UserData? _user;

  int? get id => _id;
  int? get userId => _userId;
  int? get postId => _postId;
  String? get description => _description;
  String? get createdAt => _createdAt;
  String? get updatedAt => _updatedAt;

  UserData? get user => _user;

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    map['id'] = _id;
    map['user_id'] = _userId;
    map['post_id'] = _postId;
    map['description'] = _description;
    map['created_at'] = _createdAt;
    map['updated_at'] = _updatedAt;
    if (_user != null) {
      map['user'] = _user?.toJson();
    }
    return map;
  }
}
