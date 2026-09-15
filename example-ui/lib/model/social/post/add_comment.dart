// ignore_for_file: unnecessary_getters_setters

import 'package:orange_ui/model/user/registration_user.dart';

class AddComment {
  AddComment({
    bool? status,
    String? message,
    Data? data,
  }) {
    _status = status;
    _message = message;
    _data = data;
  }

  AddComment.fromJson(dynamic json) {
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
    int? userId,
    int? postId,
    String? description,
    String? updatedAt,
    String? createdAt,
    int? id,
    Post? post,
  }) {
    _userId = userId;
    _postId = postId;
    _description = description;
    _updatedAt = updatedAt;
    _createdAt = createdAt;
    _id = id;
    _post = post;
  }

  Data.fromJson(dynamic json) {
    _userId = json['user_id'];
    _postId = json['post_id'];
    _description = json['description'];
    _updatedAt = json['updated_at'];
    _createdAt = json['created_at'];
    _id = json['id'];
    _post = json['post'] != null ? Post.fromJson(json['post']) : null;
  }

  int? _userId;
  int? _postId;
  String? _description;
  String? _updatedAt;
  String? _createdAt;
  int? _id;
  Post? _post;

  int? get userId => _userId;

  int? get postId => _postId;

  String? get description => _description;

  String? get updatedAt => _updatedAt;

  String? get createdAt => _createdAt;

  int? get id => _id;

  Post? get post => _post;

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    map['user_id'] = _userId;
    map['post_id'] = _postId;
    map['description'] = _description;
    map['updated_at'] = _updatedAt;
    map['created_at'] = _createdAt;
    map['id'] = _id;
    if (_post != null) {
      map['post'] = _post?.toJson();
    }
    return map;
  }
}

class Post {
  Post({
    int? id,
    int? userId,
    String? description,
    String? interestIds,
    int? commentsCount,
    int? likesCount,
    int? isLike,
    String? hashtags,
    String? createdAt,
    String? updatedAt,
    UserData? user,
    List<Content>? content,
  }) {
    _id = id;
    _userId = userId;
    _description = description;
    _interestIds = interestIds;
    _commentsCount = commentsCount;
    _likesCount = likesCount;
    _isLike = isLike;
    _hashtags = hashtags;
    _createdAt = createdAt;
    _updatedAt = updatedAt;
    _user = user;
    _content = content;
  }

  Post.fromJson(dynamic json) {
    _id = json['id'];
    _userId = json['user_id'];
    _description = json['description'];
    _interestIds = json['interest_ids'];
    _commentsCount = json['comments_count'];
    _likesCount = json['likes_count'];
    _isLike = json['is_like'];
    _hashtags = json['hashtags'];
    _createdAt = json['created_at'];
    _updatedAt = json['updated_at'];
    _user = json['user'] != null ? UserData.fromJson(json['user']) : null;
    if (json['content'] != null) {
      _content = [];
      json['content'].forEach((v) {
        _content?.add(Content.fromJson(v));
      });
    }
  }

  int? _id;
  int? _userId;
  String? _description;
  String? _interestIds;
  int? _commentsCount;
  int? _likesCount;
  int? _isLike;
  String? _hashtags;
  String? _createdAt;
  String? _updatedAt;
  UserData? _user;
  List<Content>? _content;

  int? get id => _id;

  int? get userId => _userId;

  String? get description => _description;

  String? get interestIds => _interestIds;

  int? get commentsCount => _commentsCount;

  int? get likesCount => _likesCount;

  int? get isLike => _isLike;

  String? get hashtags => _hashtags;

  String? get createdAt => _createdAt;

  String? get updatedAt => _updatedAt;

  UserData? get user => _user;

  List<Content>? get content => _content;

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    map['id'] = _id;
    map['user_id'] = _userId;
    map['description'] = _description;
    map['interest_ids'] = _interestIds;
    map['comments_count'] = _commentsCount;
    map['likes_count'] = _likesCount;
    map['is_like'] = _isLike;
    map['hashtags'] = _hashtags;
    map['created_at'] = _createdAt;
    map['updated_at'] = _updatedAt;
    if (_user != null) {
      map['user'] = _user?.toJson();
    }
    if (_content != null) {
      map['content'] = _content?.map((v) => v.toJson()).toList();
    }
    return map;
  }

  set user(UserData? value) {
    _user = value;
  }

  set isLike(int? value) {
    _isLike = value;
  }

  void setLikesCount(int value) {
    if ((_likesCount ?? 0) >= 0) {
      _likesCount = (_likesCount ?? 0) + value;
    }
  }

  void setCommentCount(int value) {
    if ((_commentsCount ?? 0) >= 0) {
      _commentsCount = (_commentsCount ?? 0) + value;
    }
  }
}

class Content {
  Content({
    int? id,
    int? postId,
    int? contentType,
    String? content,
    int? viewCount,
    String? thumbnail,
    String? createdAt,
    String? updatedAt,
  }) {
    _id = id;
    _postId = postId;
    _contentType = contentType;
    _content = content;
    _thumbnail = thumbnail;
    _viewCount = viewCount;
    _createdAt = createdAt;
    _updatedAt = updatedAt;
  }

  Content.fromJson(dynamic json) {
    _id = json['id'];
    _postId = json['post_id'];
    _contentType = json['content_type'];
    _content = json['content'];
    _thumbnail = json['thumbnail'];
    _viewCount = json['view_count'];
    _createdAt = json['created_at'];
    _updatedAt = json['updated_at'];
  }

  int? _id;
  int? _postId;
  int? _contentType;
  String? _content;
  String? _thumbnail;
  int? _viewCount;
  String? _createdAt;
  String? _updatedAt;

  int? get id => _id;

  int? get postId => _postId;

  int? get contentType => _contentType;

  String? get content => _content;

  String? get thumbnail => _thumbnail;

  int? get viewCount => _viewCount;

  String? get createdAt => _createdAt;

  String? get updatedAt => _updatedAt;

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    map['id'] = _id;
    map['post_id'] = _postId;
    map['content_type'] = _contentType;
    map['content'] = _content;
    map['thumbnail'] = _thumbnail;
    map['view_count'] = _viewCount;
    map['created_at'] = _createdAt;
    map['updated_at'] = _updatedAt;
    return map;
  }
}
