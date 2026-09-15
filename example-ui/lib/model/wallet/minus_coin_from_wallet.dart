class MinusCoinFromWallet {
  MinusCoinFromWallet({
    bool? status,
    String? message,
    num? wallet,
    int? totalCollected,
  }) {
    _status = status;
    _message = message;
    _wallet = wallet;
    _totalCollected = totalCollected;
  }

  MinusCoinFromWallet.fromJson(dynamic json) {
    _status = json['status'];
    _message = json['message'];
    _wallet = json['wallet'];
    _totalCollected = json['total_collected'];
  }

  bool? _status;
  String? _message;
  num? _wallet;
  int? _totalCollected;

  MinusCoinFromWallet copyWith({
    bool? status,
    String? message,
    num? wallet,
    int? totalCollected,
  }) =>
      MinusCoinFromWallet(
        status: status ?? _status,
        message: message ?? _message,
        wallet: wallet ?? _wallet,
        totalCollected: totalCollected ?? _totalCollected,
      );

  bool? get status => _status;

  String? get message => _message;

  num? get wallet => _wallet;

  int? get totalCollected => _totalCollected;

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    map['status'] = _status;
    map['message'] = _message;
    map['wallet'] = _wallet;
    map['total_collected'] = _totalCollected;
    return map;
  }
}
