class AdminNotification {
  AdminNotification({
    bool? status,
    String? message,
    List<AdminNotificationData>? data,
  }) {
    _status = status;
    _message = message;
    _data = data;
  }

  AdminNotification.fromJson(dynamic json) {
    _status = json['status'];
    _message = json['message'];
    if (json['data'] != null) {
      _data = [];
      json['data'].forEach((v) {
        _data?.add(AdminNotificationData.fromJson(v));
      });
    }
  }

  bool? _status;
  String? _message;
  List<AdminNotificationData>? _data;

  AdminNotification copyWith({
    bool? status,
    String? message,
    List<AdminNotificationData>? data,
  }) =>
      AdminNotification(
        status: status ?? _status,
        message: message ?? _message,
        data: data ?? _data,
      );

  bool? get status => _status;

  String? get message => _message;

  List<AdminNotificationData>? get data => _data;

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

/// id : 3
/// title : "title3"
/// message : "Subscribe to the Premium plan and enjoy\r\nunlimited features and have more fun.333"
/// created_at : "2021-12-02T12:20:39.000000Z"
/// updated_at : "2021-12-02T12:20:39.000000Z"

class AdminNotificationData {
  AdminNotificationData({
    int? id,
    String? title,
    String? message,
    String? createdAt,
    String? updatedAt,
  }) {
    _id = id;
    _title = title;
    _message = message;
    _createdAt = createdAt;
    _updatedAt = updatedAt;
  }

  AdminNotificationData.fromJson(dynamic json) {
    _id = json['id'];
    _title = json['title'];
    _message = json['message'];
    _createdAt = json['created_at'];
    _updatedAt = json['updated_at'];
  }

  int? _id;
  String? _title;
  String? _message;
  String? _createdAt;
  String? _updatedAt;

  AdminNotificationData copyWith({
    int? id,
    String? title,
    String? message,
    String? createdAt,
    String? updatedAt,
  }) =>
      AdminNotificationData(
        id: id ?? _id,
        title: title ?? _title,
        message: message ?? _message,
        createdAt: createdAt ?? _createdAt,
        updatedAt: updatedAt ?? _updatedAt,
      );

  int? get id => _id;

  String? get title => _title;

  String? get message => _message;

  String? get createdAt => _createdAt;

  String? get updatedAt => _updatedAt;

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    map['id'] = _id;
    map['title'] = _title;
    map['message'] = _message;
    map['created_at'] = _createdAt;
    map['updated_at'] = _updatedAt;
    return map;
  }
}
