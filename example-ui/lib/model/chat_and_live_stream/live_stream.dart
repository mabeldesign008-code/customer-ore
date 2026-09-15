import 'package:cloud_firestore/cloud_firestore.dart';

class LiveStreamUser {
  String? _agoraToken;
  num? _collectedDiamond;
  String? _fullName;
  String? _hostIdentity;
  int? _id;
  bool? _isVerified;
  int? _age;
  String? _address;
  List<String>? _joinedUser;
  int? _userId;
  String? _userImage;
  int? _watchingCount;

  LiveStreamUser({
    String? agoraToken,
    int? collectedDiamond,
    String? fullName,
    String? hostIdentity,
    int? id,
    bool? isVerified,
    List<String>? joinedUser,
    int? userId,
    String? userImage,
    int? watchingCount,
    int? age,
    String? address,
  }) {
    _agoraToken = agoraToken;
    _collectedDiamond = collectedDiamond;
    _fullName = fullName;
    _hostIdentity = hostIdentity;
    _id = id;
    _isVerified = isVerified;
    _joinedUser = joinedUser;
    _userId = userId;
    _userImage = userImage;
    _watchingCount = watchingCount;
    _age = age;
    _address = address;
  }

  Map<String, dynamic> toJson() {
    return {
      "agoraToken": _agoraToken,
      "collectedDiamond": _collectedDiamond,
      "fullName": _fullName,
      "hostIdentity": _hostIdentity,
      "id": _id,
      "isVerified": _isVerified,
      "joinedUser": _joinedUser?.map((e) => e).toList(),
      "userId": _userId,
      "userImage": _userImage,
      "watchingCount": _watchingCount,
      "age": _age,
      "address": _address
    };
  }

  LiveStreamUser.fromJson(Map<String, dynamic>? json) {
    _agoraToken = json?["agoraToken"];
    _collectedDiamond = json?["collectedDiamond"];
    _fullName = json?["fullName"];
    _hostIdentity = json?["hostIdentity"];
    _id = json?["id"];
    _isVerified = json?["isVerified"];
    if (json?["joinedUser"] != null) {
      _joinedUser = [];
      json?["joinedUser"].forEach((e) {
        _joinedUser?.add(e);
      });
    }
    _userId = json?["userId"];
    _userImage = json?["userImage"];
    _watchingCount = json?["watchingCount"];
    _address = json?["address"];
    _age = json?["age"];
  }

  int? get watchingCount => _watchingCount;

  String? get userImage => _userImage;

  int? get userId => _userId;

  List<String>? get joinedUser => _joinedUser;

  bool? get isVerified => _isVerified;

  int? get id => _id;

  String? get hostIdentity => _hostIdentity;

  String? get fullName => _fullName;

  num? get collectedDiamond => _collectedDiamond;

  String? get agoraToken => _agoraToken;

  String? get address => _address;

  int? get age => _age;
}

class LiveStreamComment {
  String? _city;
  String? _comment;
  String? _commentType;
  int? _id;
  bool? _isHost;
  int? _userId;
  String? _userImage;
  String? _userName;

  LiveStreamComment(
      {String? city,
      String? comment,
      String? commentType,
      int? id,
      bool? isHost,
      int? userId,
      String? userImage,
      String? userName}) {
    _city = city;
    _comment = comment;
    _commentType = commentType;
    _id = id;
    _isHost = isHost;
    _userId = userId;
    _userImage = userImage;
    _userName = userName;
  }

  Map<String, dynamic> toJson() {
    return {
      "city": _city,
      "comment": _comment,
      "commentType": _commentType,
      "id": _id,
      "isHost": _isHost,
      "userId": _userId,
      "userImage": _userImage,
      "userName": _userName,
    };
  }

  LiveStreamComment.fromJson(Map<String, dynamic>? json) {
    _city = json?["city"];
    _comment = json?["comment"];
    _commentType = json?["commentType"];
    _id = json?["id"];
    _isHost = json?["isHost"];
    _userId = json?["userId"];
    _userImage = json?["userImage"];
    _userName = json?["userName"];
  }

  Map<String, dynamic> toFirestore() {
    return {
      "city": _city,
      "comment": _comment,
      "commentType": _commentType,
      "id": _id,
      "isHost": _isHost,
      "userId": _userId,
      "userImage": _userImage,
      "userName": _userName,
    };
  }

  factory LiveStreamComment.fromFirestore(
    DocumentSnapshot<Map<String, dynamic>> snapshot,
    SnapshotOptions? options,
  ) {
    final data = snapshot.data();
    return LiveStreamComment(
      city: data?['city'],
      comment: data?['comment'],
      commentType: data?['commentType'],
      id: data?['id'],
      isHost: data?['isHost'],
      userId: data?['userId'],
      userImage: data?['userImage'],
      userName: data?['userName'],
    );
  }

  String? get userName => _userName;

  String? get userImage => _userImage;

  int? get userId => _userId;

  bool? get isHost => _isHost;

  int? get id => _id;

  String? get commentType => _commentType;

  String? get comment => _comment;

  String? get city => _city;
}
