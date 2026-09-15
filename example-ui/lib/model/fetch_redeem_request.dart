class FetchRedeemRequest {
  FetchRedeemRequest({
    bool? status,
    String? message,
    List<RedeemRequestData>? data,
  }) {
    _status = status;
    _message = message;
    _data = data;
  }

  FetchRedeemRequest.fromJson(dynamic json) {
    _status = json['status'];
    _message = json['message'];
    if (json['data'] != null) {
      _data = [];
      json['data'].forEach((v) {
        _data?.add(RedeemRequestData.fromJson(v));
      });
    }
  }

  bool? _status;
  String? _message;
  List<RedeemRequestData>? _data;

  FetchRedeemRequest copyWith({
    bool? status,
    String? message,
    List<RedeemRequestData>? data,
  }) =>
      FetchRedeemRequest(
        status: status ?? _status,
        message: message ?? _message,
        data: data ?? _data,
      );

  bool? get status => _status;

  String? get message => _message;

  List<RedeemRequestData>? get data => _data;

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

class RedeemRequestData {
  RedeemRequestData({
    int? id,
    int? userId,
    String? requestId,
    int? coinAmount,
    String? paymentGateway,
    String? accountDetails,
    String? amountPaid,
    int? status,
    String? createdAt,
    String? updatedAt,
  }) {
    _id = id;
    _userId = userId;
    _requestId = requestId;
    _coinAmount = coinAmount;
    _paymentGateway = paymentGateway;
    _accountDetails = accountDetails;
    _amountPaid = amountPaid;
    _status = status;
    _createdAt = createdAt;
    _updatedAt = updatedAt;
  }

  RedeemRequestData.fromJson(dynamic json) {
    _id = json['id'];
    _userId = json['user_id'];
    _requestId = json['request_id'];
    _coinAmount = json['coin_amount'];
    _paymentGateway = json['payment_gateway'];
    _accountDetails = json['account_details'];
    _amountPaid = json['amount_paid'];
    _status = json['status'];
    _createdAt = json['created_at'];
    _updatedAt = json['updated_at'];
  }

  int? _id;
  int? _userId;
  String? _requestId;
  int? _coinAmount;
  String? _paymentGateway;
  String? _accountDetails;
  String? _amountPaid;
  int? _status;
  String? _createdAt;
  String? _updatedAt;

  RedeemRequestData copyWith({
    int? id,
    int? userId,
    String? requestId,
    int? coinAmount,
    String? paymentGateway,
    String? accountDetails,
    String? amountPaid,
    int? status,
    String? createdAt,
    String? updatedAt,
  }) =>
      RedeemRequestData(
        id: id ?? _id,
        userId: userId ?? _userId,
        requestId: requestId ?? _requestId,
        coinAmount: coinAmount ?? _coinAmount,
        paymentGateway: paymentGateway ?? _paymentGateway,
        accountDetails: accountDetails ?? _accountDetails,
        amountPaid: amountPaid ?? _amountPaid,
        status: status ?? _status,
        createdAt: createdAt ?? _createdAt,
        updatedAt: updatedAt ?? _updatedAt,
      );

  int? get id => _id;

  int? get userId => _userId;

  String? get requestId => _requestId;

  int? get coinAmount => _coinAmount;

  String? get paymentGateway => _paymentGateway;

  String? get accountDetails => _accountDetails;

  String? get amountPaid => _amountPaid;

  int? get status => _status;

  String? get createdAt => _createdAt;

  String? get updatedAt => _updatedAt;

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    map['id'] = _id;
    map['user_id'] = _userId;
    map['request_id'] = _requestId;
    map['coin_amount'] = _coinAmount;
    map['payment_gateway'] = _paymentGateway;
    map['account_details'] = _accountDetails;
    map['amount_paid'] = _amountPaid;
    map['status'] = _status;
    map['created_at'] = _createdAt;
    map['updated_at'] = _updatedAt;
    return map;
  }
}
