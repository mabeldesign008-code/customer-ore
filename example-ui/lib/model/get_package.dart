class GetPackage {
  GetPackage({
    bool? status,
    String? message,
    List<GetPackageData>? data,
  }) {
    _status = status;
    _message = message;
    _data = data;
  }

  GetPackage.fromJson(dynamic json) {
    _status = json['status'];
    _message = json['message'];
    if (json['data'] != null) {
      _data = [];
      json['data'].forEach((v) {
        _data?.add(GetPackageData.fromJson(v));
      });
    }
  }

  bool? _status;
  String? _message;
  List<GetPackageData>? _data;

  GetPackage copyWith({
    bool? status,
    String? message,
    List<GetPackageData>? data,
  }) =>
      GetPackage(
        status: status ?? _status,
        message: message ?? _message,
        data: data ?? _data,
      );

  bool? get status => _status;

  String? get message => _message;

  List<GetPackageData>? get data => _data;

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

/// id : 5
/// price : "49"
/// title : "Best Value"
/// months : 12
/// playid : "minimumPackage"
/// appid : "com.retrytech.orange.12month"
/// description : "$4.1/mth"

class GetPackageData {
  GetPackageData({
    int? id,
    String? price,
    String? title,
    int? months,
    String? playid,
    String? appid,
    String? description,
  }) {
    _id = id;
    _price = price;
    _title = title;
    _months = months;
    _playid = playid;
    _appid = appid;
    _description = description;
  }

  GetPackageData.fromJson(dynamic json) {
    _id = json['id'];
    _price = json['price'];
    _title = json['title'];
    _months = json['months'];
    _playid = json['playid'];
    _appid = json['appid'];
    _description = json['description'];
  }

  int? _id;
  String? _price;
  String? _title;
  int? _months;
  String? _playid;
  String? _appid;
  String? _description;

  GetPackageData copyWith({
    int? id,
    String? price,
    String? title,
    int? months,
    String? playid,
    String? appid,
    String? description,
  }) =>
      GetPackageData(
        id: id ?? _id,
        price: price ?? _price,
        title: title ?? _title,
        months: months ?? _months,
        playid: playid ?? _playid,
        appid: appid ?? _appid,
        description: description ?? _description,
      );

  int? get id => _id;

  String? get price => _price;

  String? get title => _title;

  int? get months => _months;

  String? get playid => _playid;

  String? get appid => _appid;

  String? get description => _description;

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    map['id'] = _id;
    map['price'] = _price;
    map['title'] = _title;
    map['months'] = _months;
    map['playid'] = _playid;
    map['appid'] = _appid;
    map['description'] = _description;
    return map;
  }
}
