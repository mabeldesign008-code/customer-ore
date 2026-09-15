import 'package:orange_ui/model/user/registration_user.dart';

class FetchUserCoordinate {
  FetchUserCoordinate({
    bool? status,
    String? message,
    List<UserData>? data,
  }) {
    _status = status;
    _message = message;
    _data = data;
  }

  FetchUserCoordinate.fromJson(dynamic json) {
    _status = json['status'];
    _message = json['message'];
    if (json['data'] != null) {
      _data = [];
      json['data'].forEach((v) {
        _data?.add(UserData.fromJson(v));
      });
    }
  }

  bool? _status;
  String? _message;
  List<UserData>? _data;

  FetchUserCoordinate copyWith({
    bool? status,
    String? message,
    List<UserData>? data,
  }) =>
      FetchUserCoordinate(
        status: status ?? _status,
        message: message ?? _message,
        data: data ?? _data,
      );

  bool? get status => _status;

  String? get message => _message;

  List<UserData>? get data => _data;

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
