class GetDiamondPack {
  GetDiamondPack({
    bool? status,
    String? message,
    List<DiamondPack>? data,
  }) {
    _status = status;
    _message = message;
    _data = data;
  }

  GetDiamondPack.fromJson(dynamic json) {
    _status = json['status'];
    _message = json['message'];
    if (json['data'] != null) {
      _data = [];
      json['data'].forEach((v) {
        _data?.add(DiamondPack.fromJson(v));
      });
    }
  }

  bool? _status;
  String? _message;
  List<DiamondPack>? _data;

  GetDiamondPack copyWith({
    bool? status,
    String? message,
    List<DiamondPack>? data,
  }) =>
      GetDiamondPack(
        status: status ?? _status,
        message: message ?? _message,
        data: data ?? _data,
      );

  bool? get status => _status;

  String? get message => _message;

  List<DiamondPack>? get data => _data;

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

/// id : 1
/// amount : 500
/// price : 10
/// android_product_id : "android code"
/// ios_product_id : "ios code"

class DiamondPack {
  DiamondPack({
    int? id,
    int? amount,
    int? price,
    String? androidProductId,
    String? iosProductId,
  }) {
    _id = id;
    _amount = amount;
    _price = price;
    _androidProductId = androidProductId;
    _iosProductId = iosProductId;
  }

  DiamondPack.fromJson(dynamic json) {
    _id = json['id'];
    _amount = json['amount'];
    _price = json['price'];
    _androidProductId = json['android_product_id'];
    _iosProductId = json['ios_product_id'];
  }

  int? _id;
  int? _amount;
  int? _price;
  String? _androidProductId;
  String? _iosProductId;

  DiamondPack copyWith({
    int? id,
    int? amount,
    int? price,
    String? androidProductId,
    String? iosProductId,
  }) =>
      DiamondPack(
        id: id ?? _id,
        amount: amount ?? _amount,
        price: price ?? _price,
        androidProductId: androidProductId ?? _androidProductId,
        iosProductId: iosProductId ?? _iosProductId,
      );

  int? get id => _id;

  int? get amount => _amount;

  int? get price => _price;

  String? get androidProductId => _androidProductId;

  String? get iosProductId => _iosProductId;

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    map['id'] = _id;
    map['amount'] = _amount;
    map['price'] = _price;
    map['android_product_id'] = _androidProductId;
    map['ios_product_id'] = _iosProductId;
    return map;
  }
}
