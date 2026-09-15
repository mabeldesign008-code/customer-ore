import 'package:orange_ui/model/user/registration_user.dart';

class ViewStory {
  ViewStory({
    bool? status,
    String? message,
    Story? data,
  }) {
    _status = status;
    _message = message;
    _data = data;
  }

  ViewStory.fromJson(dynamic json) {
    _status = json['status'];
    _message = json['message'];
    _data = json['data'] != null ? Story.fromJson(json['data']) : null;
  }

  bool? _status;
  String? _message;
  Story? _data;

  bool? get status => _status;

  String? get message => _message;

  Story? get data => _data;

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
