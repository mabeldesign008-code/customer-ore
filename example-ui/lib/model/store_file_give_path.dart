class StoreFileGivePath {
  StoreFileGivePath({
    bool? status,
    String? message,
    String? path,
  }) {
    _status = status;
    _message = message;
    _path = path;
  }

  StoreFileGivePath.fromJson(dynamic json) {
    _status = json['status'];
    _message = json['message'];
    _path = json['path'];
  }

  bool? _status;
  String? _message;
  String? _path;

  StoreFileGivePath copyWith({
    bool? status,
    String? message,
    String? path,
  }) =>
      StoreFileGivePath(
        status: status ?? _status,
        message: message ?? _message,
        path: path ?? _path,
      );

  bool? get status => _status;

  String? get message => _message;

  String? get path => _path;

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    map['status'] = _status;
    map['message'] = _message;
    map['path'] = _path;
    return map;
  }
}
