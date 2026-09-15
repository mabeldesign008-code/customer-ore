import '../user/registration_user.dart';

/// status : true
/// message : "No data found"
/// data : [{"id":19,"is_block":0,"gender":1,"savedprofile":"3","likedprofile":null,"interests":[{"id":2,"title":"Artist","image":"uploads/eoALUGAez3EJLII4xHsMfoKA5f1dkylaVymy4MNW.png"},{"id":4,"title":"Travel","image":"uploads/gZCZRzfg7e6kB4cYzKgV8lRcBHLdNRwTZPyHRPYF.png"},{"id":6,"title":"Singing","image":"uploads/EgbAZng3V7wMdWQhOcMWWHy8g1OhVWCxVjZDM2ZG.png"},{"id":7,"title":"Chef","image":"uploads/hERepjzwQi40NcCcnk1kJOT3sc5Tkf80rsLpgmnp.png"},{"id":8,"title":"Walking","image":"uploads/VJkUU1OITfNNrKrnnWGC2TzUS6KbinVo5SAcivol.png"},{"id":10,"title":"Foodies","image":"uploads/gJ51Sv3mZxsTudTcySvEhlC5ToDFf9lF4xSFKDUd.png"},{"id":11,"title":"Music","image":"uploads/P1xJQyVTIj1YZxizRfbDdT1x5WE2yMLF7forLmgX.png"}],"age":22,"identity":"dhruvkathiriya.retrytech@gmail.com","fullname":"Dhruv kathiriya","instagram":"https://www.instagram.com/madhuram_sweet/","youtube":"https://www.youtube.com/watch?v=T0ur0HL6d5M&list=RDAETFvQonfV8&index=18","facebook":null,"live":"Surat, Gujarat","bio":"Roget's 21st Century Thesaurus, Third Edition Copyright © 2013 by the Philip Lie","about":"Hi, I am natalia Nora, I am 24 years old and I am looking for someone who is serious in loving and caring for me.","lattitude":null,"longitude":null,"login_type":1,"device_token":"ep9b8HrRV0LnjdMdVjxm4T:APA91bHsaQ19pKrnS9RVU7gi2D2j9TVSKJ33HLk7HBZ5fz9xIXbcXhWSOcRrzP3UtjNCcE_I93UD-zKongHsDP4jFCjCAkGTS98limdygiMDF6bWj_Nx8Cbg70cuJnrlipekvFl7NS9Q","wallet":0,"total_collected":369000,"total_streams":8,"device_type":2,"is_notification":1,"show_on_map":1,"anonymous":1,"is_video_call":0,"can_go_live":2,"images":[{"id":167,"user_id":19,"image":"uploads/dE1qIHpsFvaBaYqCIarIEzVh9kKHKTJScESDMyhh.jpg"},{"id":168,"user_id":19,"image":"uploads/gdEKTEPaiw8Aev9cGmXwcq63ppJeeyRVBozSsmgU.jpg"},{"id":169,"user_id":19,"image":"uploads/yuze3No8mmcwsZkBvQOWHvl15evbQQYfa2zBInk9.jpg"},{"id":170,"user_id":19,"image":"uploads/JYKfoa9VEWU4L95BbPkHHbaOvisLATS4s1XO3aGb.jpg"},{"id":171,"user_id":19,"image":"uploads/dUBovipr4J6MGRkgxpS1gWMGeuc8bH1PEJ1DhaXE.jpg"},{"id":172,"user_id":19,"image":"uploads/KCqGE2Tz6uxYS6oQldL14E5sqrMPKsPZva4LSnjl.jpg"}]}]

class SearchUser {
  SearchUser({
    bool? status,
    String? message,
    List<UserData>? data,
  }) {
    _status = status;
    _message = message;
    _data = data;
  }

  SearchUser.fromJson(dynamic json) {
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

  SearchUser copyWith({
    bool? status,
    String? message,
    List<UserData>? data,
  }) =>
      SearchUser(
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
