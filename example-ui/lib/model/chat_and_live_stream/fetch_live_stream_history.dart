class FetchLiveStreamHistory {
  FetchLiveStreamHistory({
    bool? status,
    String? message,
    List<FetchLiveStreamHistoryData>? data,
  }) {
    _status = status;
    _message = message;
    _data = data;
  }

  FetchLiveStreamHistory.fromJson(dynamic json) {
    _status = json['status'];
    _message = json['message'];
    if (json['data'] != null) {
      _data = [];
      json['data'].forEach((v) {
        _data?.add(FetchLiveStreamHistoryData.fromJson(v));
      });
    }
  }

  bool? _status;
  String? _message;
  List<FetchLiveStreamHistoryData>? _data;

  FetchLiveStreamHistory copyWith({
    bool? status,
    String? message,
    List<FetchLiveStreamHistoryData>? data,
  }) =>
      FetchLiveStreamHistory(
        status: status ?? _status,
        message: message ?? _message,
        data: data ?? _data,
      );

  bool? get status => _status;

  String? get message => _message;

  List<FetchLiveStreamHistoryData>? get data => _data;

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

/// id : 8
/// user_id : 19
/// started_at : "11:05 am"
/// streamed_for : "1 hr 24 mins"
/// amount_collected : 10
/// created_at : "2022-07-01T05:07:50.000000Z"
/// updated_at : "2022-07-01T05:07:50.000000Z"

class FetchLiveStreamHistoryData {
  FetchLiveStreamHistoryData({
    int? id,
    int? userId,
    String? startedAt,
    String? streamedFor,
    int? amountCollected,
    String? createdAt,
    String? updatedAt,
  }) {
    _id = id;
    _userId = userId;
    _startedAt = startedAt;
    _streamedFor = streamedFor;
    _amountCollected = amountCollected;
    _createdAt = createdAt;
    _updatedAt = updatedAt;
  }

  FetchLiveStreamHistoryData.fromJson(dynamic json) {
    _id = json['id'];
    _userId = json['user_id'];
    _startedAt = json['started_at'];
    _streamedFor = json['streamed_for'];
    _amountCollected = json['amount_collected'];
    _createdAt = json['created_at'];
    _updatedAt = json['updated_at'];
  }

  int? _id;
  int? _userId;
  String? _startedAt;
  String? _streamedFor;
  int? _amountCollected;
  String? _createdAt;
  String? _updatedAt;

  FetchLiveStreamHistoryData copyWith({
    int? id,
    int? userId,
    String? startedAt,
    String? streamedFor,
    int? amountCollected,
    String? createdAt,
    String? updatedAt,
  }) =>
      FetchLiveStreamHistoryData(
        id: id ?? _id,
        userId: userId ?? _userId,
        startedAt: startedAt ?? _startedAt,
        streamedFor: streamedFor ?? _streamedFor,
        amountCollected: amountCollected ?? _amountCollected,
        createdAt: createdAt ?? _createdAt,
        updatedAt: updatedAt ?? _updatedAt,
      );

  int? get id => _id;

  int? get userId => _userId;

  String? get startedAt => _startedAt;

  String? get streamedFor => _streamedFor;

  int? get amountCollected => _amountCollected;

  String? get createdAt => _createdAt;

  String? get updatedAt => _updatedAt;

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    map['id'] = _id;
    map['user_id'] = _userId;
    map['started_at'] = _startedAt;
    map['streamed_for'] = _streamedFor;
    map['amount_collected'] = _amountCollected;
    map['created_at'] = _createdAt;
    map['updated_at'] = _updatedAt;
    return map;
  }
}
