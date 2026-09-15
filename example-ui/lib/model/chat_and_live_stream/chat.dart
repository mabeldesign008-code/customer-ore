// ignore_for_file: unnecessary_getters_setters

import 'dart:core';

import 'package:cloud_firestore/cloud_firestore.dart';

class Conversation {
  String? _conversationId;
  bool? _blockFromOther;
  bool? _block;
  String? _deletedId;
  bool? _isDeleted;
  bool? _isMute;
  String? _lastMsg;
  String? _newMsg;
  double? _time;
  ChatUser? _user;

  Conversation({
    String? conversationId,
    bool? blockFromOther,
    bool? block,
    String? deletedId,
    bool? isDeleted,
    bool? isMute,
    String? lastMsg,
    String? newMsg,
    ChatUser? user,
    double? time,
  }) {
    _conversationId = conversationId;
    _blockFromOther = blockFromOther;
    _block = block;
    _deletedId = deletedId;
    _isDeleted = isDeleted;
    _isMute = isMute;
    _lastMsg = lastMsg;
    _newMsg = newMsg;
    _user = user;
    _time = time;
  }

  factory Conversation.fromFirestore(
    DocumentSnapshot<Map<String, dynamic>> snapshot,
    SnapshotOptions? options,
  ) {
    final data = snapshot.data();
    return Conversation(
      conversationId: data?['conversationId'],
      blockFromOther: data?['blockFromOther'],
      block: data?['block'],
      deletedId: data?['deletedId'],
      isDeleted: data?['isDeleted'],
      isMute: data?['isMute'],
      lastMsg: data?['lastMsg'],
      newMsg: data?['newMsg'],
      time: data?['time'],
      user: data?['user'] != null ? ChatUser.fromJson(data?['user']) : null,
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      if (conversationId != null) "conversationId": _conversationId,
      if (blockFromOther != null) "blockFromOther": _blockFromOther,
      if (block != null) "block": _block,
      if (deletedId != null) "deletedId": _deletedId,
      if (isDeleted != null) "isDeleted": _isDeleted,
      if (isMute != null) "isMute": _isMute,
      if (lastMsg != null) "lastMsg": _lastMsg,
      if (newMsg != null) "newMsg": _newMsg,
      if (time != null) "time": _time,
      if (user != null) "user": _user
    };
  }

  Conversation.fromJson(Map<String, dynamic> json) {
    _conversationId = json["conversationId"];
    _blockFromOther = json["blockFromOther"];
    _block = json["block"];
    _deletedId = json["deletedId"];
    _isDeleted = json["isDeleted"];
    _isMute = json["isMute"];
    _lastMsg = json["lastMsg"];
    _newMsg = json["newMsg"];
    _time = json["time"];
    _user = ChatUser.fromJson(json["user"]);
  }

  Map<String, Object?> toJson() {
    return {
      "conversationId": _conversationId,
      "blockFromOther": _blockFromOther,
      "block": _block,
      "deletedId": _deletedId,
      "isDeleted": _isDeleted,
      "isMute": _isMute,
      "lastMsg": _lastMsg,
      "newMsg": _newMsg,
      "user": _user?.toJson(),
      "time": _time,
    };
  }

  String? get conversationId => _conversationId;

  void setConversationId(String? con) {
    _conversationId = con;
  }

  bool? get blockFromOther => _blockFromOther;

  bool? get block => _block;

  ChatUser? get user => _user;

  double? get time => _time;

  String? get newMsg => _newMsg;

  String? get lastMsg => _lastMsg;

  bool? get isMute => _isMute;

  bool? get isDeleted => _isDeleted;

  String? get deletedId => _deletedId;
}

class ChatUser {
  String? _age;
  String? _city;
  String? _image;
  String? _userIdentity;
  String? _username;
  bool? _isHost;
  bool? _isNewMsg;
  double? _date;
  int? _userid;

  ChatUser({
    String? age,
    String? city,
    String? image,
    String? userIdentity,
    String? username,
    bool? isHost,
    bool? isNewMsg,
    double? date,
    int? userid,
  }) {
    _age = age;
    _city = city;
    _image = image;
    _userIdentity = userIdentity;
    _username = username;
    _isHost = isHost;
    _isNewMsg = isNewMsg;
    _date = date;
    _userid = userid;
  }

  Map<String, dynamic> toJson() {
    return {
      "age": _age,
      "city": _city,
      "image": _image,
      "userIdentity": _userIdentity,
      "username": _username,
      "isHost": _isHost,
      "isNewMsg": _isNewMsg,
      "date": _date,
      "userid": _userid,
    };
  }

  ChatUser.fromJson(Map<String, dynamic> json) {
    _age = json["age"];
    _city = json["city"];
    _image = json["image"];
    _userIdentity = json["userIdentity"];
    _username = json["username"];
    _isHost = json["isHost"];
    _isNewMsg = json["isNewMsg"];
    _date = json["date"];
    _userid = json["userid"];
  }

  int? get userid => _userid;

  double? get date => _date;

  bool? get isNewMsg => _isNewMsg;

  set isNewMsg(bool? value) {
    _isNewMsg = value;
  }

  set age(String? value) {
    _age = value;
  }

  bool? get isHost => _isHost;

  String? get username => _username;

  String? get userIdentity => _userIdentity;

  String? get image => _image;

  String? get city => _city;

  String? get age => _age;

  set city(String? value) {
    _city = value;
  }

  set image(String? value) {
    _image = value;
  }

  set userIdentity(String? value) {
    _userIdentity = value;
  }

  set username(String? value) {
    _username = value;
  }

  set isHost(bool? value) {
    _isHost = value;
  }

  set date(double? value) {
    _date = value;
  }

  set userid(int? value) {
    _userid = value;
  }
}

class ChatMessage {
  String? _id;
  String? _image;
  String? _video;
  String? _msg;
  String? _msgType;
  double? _time;
  ChatUser? _senderUser;
  List<String>? _notDeletedIdentities;

  ChatMessage(
      {String? id,
      String? image,
      String? video,
      String? msg,
      String? msgType,
      double? time,
      ChatUser? senderUser,
      List<String>? notDeletedIdentities}) {
    _id = id;
    _image = image;
    _video = video;
    _msg = msg;
    _msgType = msgType;
    _time = time;
    _senderUser = senderUser;
    _notDeletedIdentities = notDeletedIdentities;
  }

  Map<String, dynamic> toJson() {
    return {
      "id": _id,
      "image": _image,
      "video": _video,
      "msg": _msg,
      "msgType": _msgType,
      "time": _time,
      "senderUser": _senderUser?.toJson(),
      "not_deleted_identities": _notDeletedIdentities?.map((v) => v).toList()
    };
  }

  ChatMessage.fromJson(Map<String, dynamic>? json) {
    _id = json?["id"];
    _image = json?["image"];
    _video = json?["video"];
    _msg = json?["msg"];
    _msgType = json?["msgType"];
    _time = json?["time"];
    _senderUser = ChatUser.fromJson(json?["senderUser"]);
    if (json?['not_deleted_identities'] != null) {
      _notDeletedIdentities = [];
      json?['not_deleted_identities'].forEach((v) {
        _notDeletedIdentities?.add(v);
      });
    }
  }

  factory ChatMessage.fromFirestore(
    DocumentSnapshot<Map<String, dynamic>> snapshot,
    SnapshotOptions? options,
  ) {
    final data = snapshot.data();
    List<String> notDeletedIdentities = [];
    data?['not_deleted_identities'].forEach((v) {
      notDeletedIdentities.add(v);
    });
    return ChatMessage(
      image: data?['image'],
      video: data?['video'],
      id: data?['id'],
      msg: data?['msg'],
      time: data?['time'],
      msgType: data?['msgType'],
      notDeletedIdentities: notDeletedIdentities,
      senderUser: ChatUser.fromJson(data?["senderUser"]),
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      if (id != null) "id": _id,
      if (image != null) "image": _image,
      if (video != null) "video": _video,
      if (msg != null) "msg": _msg,
      if (msgType != null) "msgType": _msgType,
      if (time != null) "time": _time,
      if (senderUser != null) "senderUser": _senderUser,
      if (notDeletedIdentities != null)
        "not_deleted_identities": _notDeletedIdentities?.map((v) => v).toList()
    };
  }

  String? get video => _video;

  List<String>? get notDeletedIdentities => _notDeletedIdentities;

  ChatUser? get senderUser => _senderUser;

  double? get time => _time;

  String? get msgType => _msgType;

  String? get msg => _msg;

  String? get image => _image;

  String? get id => _id;
}
