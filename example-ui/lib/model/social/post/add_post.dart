import 'package:orange_ui/model/social/post/add_comment.dart';

class AddPost {
  AddPost({
    bool? status,
    String? message,
    Post? data,
  }) {
    _status = status;
    _message = message;
    _data = data;
  }

  AddPost.fromJson(dynamic json) {
    _status = json['status'];
    _message = json['message'];
    _data = json['data'] != null ? Post.fromJson(json['data']) : null;
  }
  bool? _status;
  String? _message;
  Post? _data;

  bool? get status => _status;
  String? get message => _message;
  Post? get data => _data;

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
