import 'package:orange_ui/model/social/post/add_comment.dart';

class LikePost {
  LikePost({
    bool? status,
    String? message,
    LikePostData? data,
  }) {
    _status = status;
    _message = message;
    _data = data;
  }

  LikePost.fromJson(dynamic json) {
    _status = json['status'];
    _message = json['message'];
    _data = json['data'] != null ? LikePostData.fromJson(json['data']) : null;
  }
  bool? _status;
  String? _message;
  LikePostData? _data;

  bool? get status => _status;
  String? get message => _message;
  LikePostData? get data => _data;

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

class LikePostData {
  LikePostData({
    int? userId,
    int? postId,
    String? updatedAt,
    String? createdAt,
    int? id,
    Post? post,
  }) {
    _userId = userId;
    _postId = postId;
    _updatedAt = updatedAt;
    _createdAt = createdAt;
    _id = id;
    _post = post;
  }

  LikePostData.fromJson(dynamic json) {
    _userId = json['user_id'];
    _postId = json['post_id'];
    _updatedAt = json['updated_at'];
    _createdAt = json['created_at'];
    _id = json['id'];
    _post = json['post'] != null ? Post.fromJson(json['post']) : null;
  }
  int? _userId;
  int? _postId;
  String? _updatedAt;
  String? _createdAt;
  int? _id;
  Post? _post;

  int? get userId => _userId;
  int? get postId => _postId;
  String? get updatedAt => _updatedAt;
  String? get createdAt => _createdAt;
  int? get id => _id;
  Post? get post => _post;

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    map['user_id'] = _userId;
    map['post_id'] = _postId;
    map['updated_at'] = _updatedAt;
    map['created_at'] = _createdAt;
    map['id'] = _id;
    if (_post != null) {
      map['post'] = _post?.toJson();
    }
    return map;
  }
}
