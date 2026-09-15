import 'package:orange_ui/model/user/registration_user.dart';

/// status : true
/// message : "Verification request submitted successfully !"
/// data : {"id":14,"is_block":1,"gender":1,"savedprofile":null,"likedprofile":null,"interests":[{"id":2,"title":"Artist","image":"uploads/eoALUGAez3EJLII4xHsMfoKA5f1dkylaVymy4MNW.png"}],"age":25,"identity":"aniket@gmail.com","fullname":"Aniket Vaddoriya","instagram":"https://www.instagram.com/ankur_kalkani/?hl=en","youtube":"https://www.youtube.com/","facebook":"https://www.facebook.com/ankur.kalkani.912","live":"Surat, Gujrat, India","bio":"Roget's 21st Century Thesaurus, Third Edition Copyright © 2013 by the Philip Lief Group.","about":"😊😊😊","lattitude":null,"longitude":null,"login_type":4,"device_token":"fldaB6Ej6kyNr6r_FYotj2:APA91bGLlB3dOD-Ylu7w-GrbcL7jCT5qcC1lkc_BPE3c0TB4LxEK87kuZ3isJiGOuZxQAnSoeaTj3RQvh2v_zUkzyqQi3GGerWGrWAhMs-P7lJfRf_qZvL7dnbzcnCsdiRc7EdO6Art_","wallet":0,"total_collected":0,"total_streams":0,"device_type":2,"is_notification":1,"is_verified":1,"show_on_map":1,"anonymous":0,"is_video_call":1,"can_go_live":2,"images":[{"id":71,"user_id":14,"image":"uploads/VCufc66FOOuNeD8Aa5I5mZsQ9ZSImBlPznccqtqq.jpg"}]}

class Verification {
  Verification({
    bool? status,
    String? message,
    UserData? data,
  }) {
    _status = status;
    _message = message;
    _data = data;
  }

  Verification.fromJson(dynamic json) {
    _status = json['status'];
    _message = json['message'];
    _data = json['data'] != null ? UserData.fromJson(json['data']) : null;
  }

  bool? _status;
  String? _message;
  UserData? _data;

  Verification copyWith({
    bool? status,
    String? message,
    UserData? data,
  }) =>
      Verification(
        status: status ?? _status,
        message: message ?? _message,
        data: data ?? _data,
      );

  bool? get status => _status;

  String? get message => _message;

  UserData? get data => _data;

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
