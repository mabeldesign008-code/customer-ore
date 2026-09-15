class DeletePost {
  DeletePost({
    bool? status,
    String? message,
    Data? data,
  }) {
    _status = status;
    _message = message;
    _data = data;
  }

  DeletePost.fromJson(dynamic json) {
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
    int? id,
    int? userId,
    String? description,
    String? interestIds,
    int? commentsCount,
    int? likesCount,
    String? hashtags,
    String? createdAt,
    String? updatedAt,
  }) {
    _id = id;
    _userId = userId;
    _description = description;
    _interestIds = interestIds;
    _commentsCount = commentsCount;
    _likesCount = likesCount;
    _hashtags = hashtags;
    _createdAt = createdAt;
    _updatedAt = updatedAt;
  }

  Data.fromJson(dynamic json) {
    _id = json['id'];
    _userId = json['user_id'];
    _description = json['description'];
    _interestIds = json['interest_ids'];
    _commentsCount = json['comments_count'];
    _likesCount = json['likes_count'];
    _hashtags = json['hashtags'];
    _createdAt = json['created_at'];
    _updatedAt = json['updated_at'];
  }
  int? _id;
  int? _userId;
  String? _description;
  String? _interestIds;
  int? _commentsCount;
  int? _likesCount;
  String? _hashtags;
  String? _createdAt;
  String? _updatedAt;

  int? get id => _id;
  int? get userId => _userId;
  String? get description => _description;
  String? get interestIds => _interestIds;
  int? get commentsCount => _commentsCount;
  int? get likesCount => _likesCount;
  String? get hashtags => _hashtags;
  String? get createdAt => _createdAt;
  String? get updatedAt => _updatedAt;

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    map['id'] = _id;
    map['user_id'] = _userId;
    map['description'] = _description;
    map['interest_ids'] = _interestIds;
    map['comments_count'] = _commentsCount;
    map['likes_count'] = _likesCount;
    map['hashtags'] = _hashtags;
    map['created_at'] = _createdAt;
    map['updated_at'] = _updatedAt;
    return map;
  }
}
