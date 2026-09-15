// ignore_for_file: unnecessary_getters_setters

import 'package:collection/collection.dart';
import 'package:orange_ui/common/common_fun.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/setting_model.dart';
import 'package:orange_ui/screen/create_profile_screen/create_profile_screen_view_model.dart';
import 'package:orange_ui/service/extention/string_extention.dart';
import 'package:orange_ui/service/session_manager.dart';
import 'package:orange_ui/story_view/controller/story_controller.dart';
import 'package:orange_ui/story_view/widgets/story_view.dart';
import 'package:orange_ui/utils/app_res.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/const_res.dart';

class UserModel {
  UserModel({
    bool? status,
    String? message,
    UserData? data,
  }) {
    _status = status;
    _message = message;
    _data = data;
  }

  UserModel.fromJson(dynamic json) {
    _status = json['status'];
    _message = json['message'];
    _data = json['data'] != null ? UserData.fromJson(json['data']) : null;
  }

  bool? _status;
  String? _message;
  UserData? _data;

  UserModel copyWith({
    bool? status,
    String? message,
    UserData? data,
  }) =>
      UserModel(
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

class UserData {
  UserData({
    this.id,
    this.isBlock,
    this.gender = GenderType.male,
    this.dob,
    this.savedProfile,
    this.likedProfile,
    this.interests,
    this.identity,
    this.username,
    this.fullname,
    this.instagram,
    this.youtube,
    this.facebook,
    this.bio,
    this.about,
    this.latitude,
    this.longitude,
    this.loginType,
    this.deviceToken,
    this.blockedUsers,
    this.wallet,
    this.totalCollected,
    this.totalStreams,
    this.deviceType,
    this.isNotification,
    this.isVerified,
    this.showOnMap,
    this.anonymous,
    this.isVideoCall,
    this.canGoLive,
    this.isLiveNow,
    this.isFake,
    this.password,
    this.following,
    this.followers,
    this.genderPreferred = GenderType.male,
    this.agePreferredMin,
    this.agePreferredMax,
    this.distancePreference,
    this.relationshipGoalId,
    this.religionKey,
    this.languageKeys,
    this.createdAt,
    this.updatedAt,
    this.images,
    this.isLiked,
    this.followingStatus,
    this.matchedInterests,
    this.matchedLanguages,
    this.matchedRelationshipGoalId,
    this.matchedReligion,
    this.matchScore,
    this.hiddenUserIds,
    this.country,
    this.state,
    this.city,
    this.appLanguage,
  });

  UserData.fromJson(dynamic json) {
    id = json['id'];
    isBlock = json['is_block'];
    gender = json['gender'] == null || json['gender'] == 'null'
        ? GenderType.male
        : GenderType.fromString(json['gender']);
    dob = json['dob'];
    savedProfile = json['savedprofile'];
    likedProfile = json['likedprofile'];
    interests = json['interests'];
    identity = json['identity'];
    username = json['username'];
    fullname = json['fullname'];
    instagram = json['instagram'];
    youtube = json['youtube'];
    facebook = json['facebook'];
    bio = json['bio'];
    about = json['about'];
    latitude = json['lattitude'];
    longitude = json['longitude'];
    loginType = json['login_type'];
    deviceToken = json['device_token'];
    blockedUsers = json['blocked_users'];
    wallet = json['wallet'];
    totalCollected = json['total_collected'];
    totalStreams = json['total_streams'];
    deviceType = json['device_type'];
    isNotification = json['is_notification'];
    isVerified = json['is_verified'];
    showOnMap = json['show_on_map'];
    anonymous = json['anonymous'];
    isVideoCall = json['is_video_call'];
    canGoLive = json['can_go_live'];
    isLiveNow = json['is_live_now'];
    isFake = json['is_fake'];
    password = json['password'];
    following = json['following'];
    followers = json['followers'];
    genderPreferred =
        json['gender_preferred'] == null || json['gender_preferred'] == 'null'
            ? GenderType.male
            : GenderType.fromString(json['gender_preferred']);
    agePreferredMin = json['age_preferred_min'];
    agePreferredMax = json['age_preferred_max'];
    distancePreference = json['distance_preference'];
    relationshipGoalId = json['relationship_goal_id'];
    religionKey = json['religion_key'];
    languageKeys = json['language_keys'];
    createdAt = json['created_at'];
    updatedAt = json['updated_at'];
    isLiked = json['is_like'];
    followingStatus = json['followingStatus'];
    matchedInterests = json['matched_interests'];
    matchedLanguages = json['matched_languages'];
    matchedRelationshipGoalId = json['matched_relationship_goal_id'];
    matchedReligion = json['matched_religion'];
    matchScore = json['match_score'];
    hiddenUserIds = json['hidden_user_ids'];
    country = json['country'];
    state = json['state'];
    city = json['city'];
    appLanguage = json['app_language'];
    if (json['images'] != null) {
      images = [];
      json['images'].forEach((v) {
        images?.add(Images.fromJson(v));
      });
    }
    if (json['stories'] != null) {
      story = [];
      json['stories'].forEach((v) {
        var s = Story.fromJson(v);
        s.user = this;
        story?.add(s);
      });
    }
  }

  int? id;
  int? isBlock;
  GenderType gender = GenderType.male;
  String? savedProfile;
  String? likedProfile;
  String? interests;
  String? dob;
  String? identity;
  String? username;
  String? fullname;
  String? instagram;
  String? youtube;
  String? facebook;

  // String? live;
  String? bio;
  String? about;
  String? latitude;
  String? longitude;
  int? loginType;
  String? deviceToken;
  String? blockedUsers;
  int? wallet;
  int? totalCollected;
  int? totalStreams;
  int? deviceType;
  int? isNotification;
  int? isVerified;
  int? showOnMap;
  int? anonymous;
  int? isVideoCall;
  int? canGoLive;
  int? isLiveNow;
  int? isFake;
  String? password;
  int? following;
  int? followers;
  GenderType genderPreferred = GenderType.male;
  int? agePreferredMin;
  int? agePreferredMax;
  int? distancePreference;
  int? relationshipGoalId;
  String? religionKey;
  String? languageKeys;
  String? createdAt;
  String? updatedAt;
  bool? isLiked;
  int? followingStatus;
  List<Images>? images;
  List<Story>? story;
  String? matchedInterests;
  String? matchedLanguages;
  int? matchedRelationshipGoalId;
  String? matchedReligion;
  int? matchScore;
  String? hiddenUserIds;
  String? country;
  String? state;
  String? city;
  String? appLanguage;

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    map['id'] = id;
    map['is_block'] = isBlock;
    map['gender'] = gender.value;
    map['savedprofile'] = savedProfile;
    map['likedprofile'] = likedProfile;
    map['interests'] = interests;
    map['dob'] = dob;
    map['identity'] = identity;
    map['username'] = username;
    map['fullname'] = fullname;
    map['instagram'] = instagram;
    map['youtube'] = youtube;
    map['facebook'] = facebook;
    map['bio'] = bio;
    map['about'] = about;
    map['lattitude'] = latitude;
    map['longitude'] = longitude;
    map['login_type'] = loginType;
    map['device_token'] = deviceToken;
    map['blocked_users'] = blockedUsers;
    map['wallet'] = wallet;
    map['total_collected'] = totalCollected;
    map['total_streams'] = totalStreams;
    map['device_type'] = deviceType;
    map['is_notification'] = isNotification;
    map['is_verified'] = isVerified;
    map['show_on_map'] = showOnMap;
    map['anonymous'] = anonymous;
    map['is_video_call'] = isVideoCall;
    map['can_go_live'] = canGoLive;
    map['is_live_now'] = isLiveNow;
    map['is_fake'] = isFake;
    map['password'] = password;
    map['following'] = following;
    map['followers'] = followers;
    map['gender_preferred'] = genderPreferred.value;
    map['age_preferred_min'] = agePreferredMin;
    map['age_preferred_max'] = agePreferredMax;
    map['distance_preference'] = distancePreference;
    map['relationship_goal_id'] = relationshipGoalId;
    map['religion_key'] = religionKey;
    map['language_keys'] = languageKeys;
    map['created_at'] = createdAt;
    map['updated_at'] = updatedAt;
    map['is_like'] = isLiked;
    map['matched_interests'] = matchedInterests;
    map['matched_languages'] = matchedLanguages;
    map['matched_relationship_goal_id'] = matchedRelationshipGoalId;
    map['matched_religion'] = matchedReligion;
    map['match_score'] = matchScore;
    map['followingStatus'] = followingStatus;
    map['hidden_user_ids'] = hiddenUserIds;
    map['country'] = country;
    map['state'] = state;
    map['city'] = city;
    map['app_language'] = appLanguage;
    if (images != null) {
      map['images'] = images?.map((v) => v.toJson()).toList();
    }
    if (story != null) {
      map['stories'] = story?.map((v) => v.toJson()).toList();
    }
    return map;
  }

  List<SocialLink> get socialLinks {
    List<SocialLink> links = [];
    if (instagram != null && instagram!.isNotEmpty) {
      links.add(
          SocialLink(AssetRes.instagramLogo, S.current.instagram, instagram!));
    }
    if (facebook != null && facebook!.isNotEmpty) {
      links.add(
          SocialLink(AssetRes.facebookLogo, S.current.facebook, facebook!));
    }
    if (youtube != null && youtube!.isNotEmpty) {
      links.add(SocialLink(AssetRes.youtubeLogo, S.current.youtube, youtube!));
    }
    return links;
  }

  void followerCount(int value) {
    followers = (followers ?? 0) + value;
  }

  bool isAllStoryShown() {
    var isWatched = true;
    for (var element in (story ?? [])) {
      if (!element.isWatchedByMe()) {
        isWatched = false;
        break;
      }
    }
    return isWatched;
  }

  int get age => dob?.dateTimeToAge ?? 0;

  List<String> get interestList {
    final SettingData? settingData = SessionManager.instance.getSettings();
    final List<String> interestIds = interests?.split(',') ?? [];

    if (settingData == null || settingData.interests == null) return [];

    return (settingData.interests ?? [])
        .where((interest) => interestIds.contains(interest.id.toString()))
        .map((interest) => interest.title ?? '')
        .toList();
  }

  String? get relationShipGoal {
    final SettingData? settingData = SessionManager.instance.getSettings();
    final List<RelationshipGoals> items = settingData?.relationshipGoals ?? [];

    if (items.isEmpty) return null;

    RelationshipGoals? goal = items.firstWhereOrNull((element) =>
        element.isDeleted == 0 && element.id == relationshipGoalId);
    return goal?.title;
  }

  List<String> get languageList {
    final SettingData? settingData = SessionManager.instance.getSettings();
    final List<Language> items = settingData?.language ?? [];
    List<String> ids =
        languageKeys?.split(',').map((e) => e.trim()).toList() ?? [];
    if (items.isEmpty || ids.isEmpty) return [];
    return items
        .where((language) =>
            language.isDeleted == 0 &&
            ids.contains(language.title?.removeEmojis.trim()))
        .map((language) => language.title ?? '')
        .toList();
  }

  bool get isSaved {
    String saved = SessionManager.instance.getUser()?.savedProfile ?? '';
    if (saved.isEmpty) return false;
    List<String> savedIds = saved.split(',');
    return savedIds.contains(id.toString());
  }

  set isSaved(bool saved) {
    final currentUser = SessionManager.instance.getUser();
    if (currentUser == null || id == null) return;

    final savedIds = (currentUser.savedProfile ?? '')
        .split(',')
        .where((e) => e.isNotEmpty)
        .toList();

    if (saved) {
      if (!savedIds.contains(id.toString())) {
        savedIds.add(id.toString());
      }
    } else {
      savedIds.remove(id.toString());
    }

    // Update the session user data
    currentUser.savedProfile = savedIds.join(',');
    SessionManager.instance.setUser(currentUser);
  }

  bool get isBlocked {
    String blocked = SessionManager.instance.getUser()?.blockedUsers ?? '';
    if (blocked.isEmpty) return false;
    List<String> blockedIds = blocked.split(',');
    return blockedIds.contains(id.toString());
  }

  set isBlocked(bool blocked) {
    final currentUser = SessionManager.instance.getUser();
    if (currentUser == null || id == null) return;

    final blockedIds = (currentUser.blockedUsers ?? '')
        .split(',')
        .where((e) => e.isNotEmpty)
        .toList();

    if (blocked) {
      if (!blockedIds.contains(id.toString())) {
        blockedIds.add(id.toString());
      }
    } else {
      blockedIds.remove(id.toString());
    }

    // Update the session user data
    currentUser.blockedUsers = blockedIds.join(',');
    SessionManager.instance.setUser(currentUser);
  }

  String get profileImage {
    return CommonFun.getProfileImage(images: images);
  }

  DateTime get ageToDateTime {
    if (dob == null) {
      return DateTime(DateTime.now().year - 18);
    }
    return DateTime.parse(dob!);
  }

  bool get isVerify {
    return isVerified == 2 || isVerified == 3;
  }

  String get address {
    return country == null ? '' : '$city, $state, $country';
  }

  String get locationDistance {
    UserData? myUserData = SessionManager.instance.getUser();
    double myLatitude = double.parse("${myUserData?.latitude ?? 0.0}");
    double myLongitude = double.parse("${myUserData?.longitude ?? 0.0}");
    double userLatitude = double.parse("${latitude ?? 0.0}");
    double userLongitude = double.parse("${longitude ?? 0.0}");

    double distance = CommonFun().calculateDistance(
        lat1: myLatitude,
        lon1: myLongitude,
        lat2: userLatitude,
        lon2: userLongitude);
    return distance.toStringAsFixed(2);
  }
}

class SocialLink {
  final String icon;
  final String title;
  final String link;

  SocialLink(this.icon, this.title, this.link);
}

class Images {
  Images({
    int? id,
    int? userId,
    String? image,
  }) {
    _id = id;
    _userId = userId;
    _image = image;
  }

  Images.fromJson(dynamic json) {
    _id = json['id'];
    _userId = json['user_id'];
    _image = json['image'];
  }

  int? _id;
  int? _userId;
  String? _image;

  Images copyWith({
    int? id,
    int? userId,
    String? image,
  }) =>
      Images(
        id: id ?? _id,
        userId: userId ?? _userId,
        image: image ?? _image,
      );

  int? get id => _id;

  int? get userId => _userId;

  String? get image => _image;

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    map['id'] = _id;
    map['user_id'] = _userId;
    map['image'] = _image;
    return map;
  }
}

class Story {
  Story({
    int? id,
    int? userId,
    int? type,
    int? duration,
    String? content,
    String? viewByUserIds,
    String? createdAt,
    String? updatedAt,
    bool? storyView,
  }) {
    _id = id;
    _userId = userId;
    _type = type;
    _duration = duration;
    _content = content;
    _viewByUserIds = viewByUserIds;
    _createdAt = createdAt;
    _updatedAt = updatedAt;
    _storyView = storyView;
  }

  Story.fromJson(dynamic json) {
    _id = json['id'];
    _userId = json['user_id'];
    _type = json['type'];
    _duration = json['duration'];
    _content = json['content'];
    _viewByUserIds = json['view_by_user_ids'];
    _createdAt = json['created_at'];
    _updatedAt = json['updated_at'];
    _storyView = json['storyView'];
  }

  int? _id;
  int? _userId;
  int? _type;
  int? _duration;
  String? _content;
  String? _viewByUserIds;
  String? _createdAt;
  String? _updatedAt;
  bool? _storyView;
  UserData? user;

  int? get id => _id;

  int? get userId => _userId;

  int? get type => _type;

  int? get duration => _duration;

  String? get content => _content;

  String? get viewByUserIds => _viewByUserIds;

  String? get createdAt => _createdAt;

  String? get updatedAt => _updatedAt;

  bool? get storyView => _storyView;

  set viewByUserIds(String? value) {
    _viewByUserIds = value;
  }

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    map['id'] = _id;
    map['user_id'] = _userId;
    map['type'] = _type;
    map['duration'] = _duration;
    map['content'] = _content;
    map['view_by_user_ids'] = _viewByUserIds;
    map['created_at'] = _createdAt;
    map['updated_at'] = _updatedAt;
    map['storyView'] = _storyView;
    return map;
  }

  bool isWatchedByMe() {
    var arr = viewByUserIds?.split(',') ?? [];
    return arr.contains(SessionManager.instance.getUserID().toString());
  }

  List<String> viewedByUsersIds() {
    return viewByUserIds?.split(',') ?? [];
  }

  StoryItem toStoryItem(StoryController controller) {
    if (type == 1) {
      return StoryItem.pageVideo(
        '${ConstRes.aImageBaseUrl}$content',
        story: this,
        controller: controller,
        duration: Duration(seconds: (duration ?? 0).toInt()),
        shown: isWatchedByMe(),
        id: id ?? 0,
        viewedByUsersIds: viewedByUsersIds(),
      );
    } else if (type == 0) {
      return StoryItem.pageImage(
        story: this,
        url: '${ConstRes.aImageBaseUrl}$content',
        controller: controller,
        duration: const Duration(seconds: AppRes.storyDuration),
        shown: isWatchedByMe(),
        id: id ?? 0,
        viewedByUsersIds: viewedByUsersIds(),
      );
    } else {
      return StoryItem.text(
        story: this,
        title: content ?? '',
        backgroundColor: ColorRes.black,
        shown: isWatchedByMe(),
        id: id ?? 0,
        duration: const Duration(seconds: AppRes.storyDuration),
        viewedByUsersIds: viewedByUsersIds(),
      );
    }
  }

  DateTime get date => DateTime.parse(createdAt ?? '');
}
