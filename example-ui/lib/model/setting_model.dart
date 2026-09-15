import 'package:orange_ui/service/extention/string_extention.dart';

class SettingModel {
  SettingModel({
    bool? status,
    String? message,
    SettingData? data,
  }) {
    _status = status;
    _message = message;
    _data = data;
  }

  SettingModel.fromJson(dynamic json) {
    _status = json['status'];
    _message = json['message'];
    _data = json['data'] != null ? SettingData.fromJson(json['data']) : null;
  }

  bool? _status;
  String? _message;
  SettingData? _data;

  SettingModel copyWith({bool? status, String? message, SettingData? data}) =>
      SettingModel(
        status: status ?? _status,
        message: message ?? _message,
        data: data ?? _data,
      );

  bool? get status => _status;

  String? get message => _message;

  SettingData? get data => _data;

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

class SettingData {
  SettingData({
    this.appdata,
    this.gifts,
    this.interests,
    this.relationshipGoals,
    this.religions,
    this.language,
    this.onboardingScreen,
  });

  SettingData.fromJson(dynamic json) {
    appdata =
        json['appdata'] != null ? Appdata.fromJson(json['appdata']) : null;
    if (json['gifts'] != null) {
      gifts = [];
      json['gifts'].forEach((v) {
        gifts?.add(Gifts.fromJson(v));
      });
    }
    if (json['interests'] != null) {
      interests = [];
      json['interests'].forEach((v) {
        interests?.add(Interests.fromJson(v));
      });
    }
    if (json['relationship_goals'] != null) {
      relationshipGoals = [];
      json['relationship_goals'].forEach((v) {
        relationshipGoals?.add(RelationshipGoals.fromJson(v));
      });
    }
    if (json['religions'] != null) {
      religions = [];
      json['religions'].forEach((v) {
        religions?.add(Religions.fromJson(v));
      });
    }
    if (json['language'] != null) {
      language = [];
      json['language'].forEach((v) {
        language?.add(Language.fromJson(v));
      });
    }
    if (json['onboarding_screen'] != null) {
      onboardingScreen = [];
      json['onboarding_screen'].forEach((v) {
        onboardingScreen?.add(Onboarding.fromJson(v));
      });
    }
  }

  Appdata? appdata;
  List<Gifts>? gifts;
  List<Interests>? interests;
  List<RelationshipGoals>? relationshipGoals;
  List<Religions>? religions;
  List<Language>? language;
  List<Onboarding>? onboardingScreen;

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    if (appdata != null) {
      map['appdata'] = appdata?.toJson();
    }
    if (gifts != null) {
      map['gifts'] = gifts?.map((v) => v.toJson()).toList();
    }
    if (interests != null) {
      map['interests'] = interests?.map((v) => v.toJson()).toList();
    }
    if (relationshipGoals != null) {
      map['relationship_goals'] =
          relationshipGoals?.map((v) => v.toJson()).toList();
    }
    if (religions != null) {
      map['religions'] = religions?.map((v) => v.toJson()).toList();
    }
    if (language != null) {
      map['language'] = language?.map((v) => v.toJson()).toList();
    }
    if (onboardingScreen != null) {
      map['onboarding_screen'] =
          onboardingScreen?.map((v) => v.toJson()).toList();
    }
    return map;
  }
}

class Onboarding {
  Onboarding({
    this.id,
    this.position,
    this.image,
    this.title,
    this.description,
    this.createdAt,
    this.updatedAt,
  });

  Onboarding.fromJson(dynamic json) {
    id = json['id'];
    position = json['position'];
    image = json['image'];
    title = json['title'];
    description = json['description'];
    createdAt = json['created_at'];
    updatedAt = json['updated_at'];
  }

  num? id;
  num? position;
  String? image;
  String? title;
  String? description;
  String? createdAt;
  String? updatedAt;

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    map['id'] = id;
    map['position'] = position;
    map['image'] = image;
    map['title'] = title;
    map['description'] = description;
    map['created_at'] = createdAt;
    map['updated_at'] = updatedAt;
    return map;
  }
}

class Language {
  Language({
    this.id,
    this.title,
    this.isDeleted,
    this.createdAt,
    this.updatedAt,
  });

  Language.fromJson(dynamic json) {
    id = json['id'];
    title = json['title'];
    isDeleted = json['is_deleted'];
    createdAt = json['created_at'];
    updatedAt = json['updated_at'];
  }

  num? id;
  String? title;
  num? isDeleted;
  String? createdAt;
  String? updatedAt;

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    map['id'] = id;
    map['title'] = title;
    map['is_deleted'] = isDeleted;
    map['created_at'] = createdAt;
    map['updated_at'] = updatedAt;
    return map;
  }

  String get titleRemoveEmoji {
    return title?.removeEmojis.trim() ?? '';
  }
}

class Religions {
  Religions({
    this.id,
    this.title,
    this.isDeleted,
    this.createdAt,
    this.updatedAt,
  });

  Religions.fromJson(dynamic json) {
    id = json['id'];
    title = json['title'];
    isDeleted = json['is_deleted'];
    createdAt = json['created_at'];
    updatedAt = json['updated_at'];
  }

  num? id;
  String? title;
  num? isDeleted;
  String? createdAt;
  String? updatedAt;

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    map['id'] = id;
    map['title'] = title;
    map['is_deleted'] = isDeleted;
    map['created_at'] = createdAt;
    map['updated_at'] = updatedAt;
    return map;
  }

  String get titleRemoveEmoji {
    return title?.removeEmojis.trim() ?? '';
  }
}

class RelationshipGoals {
  RelationshipGoals({
    this.id,
    this.title,
    this.description,
    this.isDeleted,
    this.createdAt,
    this.updatedAt,
  });

  RelationshipGoals.fromJson(dynamic json) {
    id = json['id'];
    title = json['title'];
    description = json['description'];
    isDeleted = json['is_deleted'];
    createdAt = json['created_at'];
    updatedAt = json['updated_at'];
  }

  int? id;
  String? title;
  String? description;
  int? isDeleted;
  String? createdAt;
  String? updatedAt;

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    map['id'] = id;
    map['title'] = title;
    map['description'] = description;
    map['is_deleted'] = isDeleted;
    map['created_at'] = createdAt;
    map['updated_at'] = updatedAt;
    return map;
  }
}

class Interests {
  Interests({
    this.id,
    this.title,
    this.isDeleted,
    this.createdAt,
    this.updatedAt,
  });

  Interests.fromJson(dynamic json) {
    id = json['id'];
    title = json['title'];
    isDeleted = json['is_deleted'];
    createdAt = json['created_at'];
    updatedAt = json['updated_at'];
  }

  int? id;
  String? title;
  int? isDeleted;
  String? createdAt;
  String? updatedAt;

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    map['id'] = id;
    map['title'] = title;
    map['is_deleted'] = isDeleted;
    map['created_at'] = createdAt;
    map['updated_at'] = updatedAt;
    return map;
  }
}

class Gifts {
  Gifts({
    this.id,
    this.coinPrice,
    this.image,
    this.createdAt,
    this.updatedAt,
  });

  Gifts.fromJson(dynamic json) {
    id = json['id'];
    coinPrice = json['coin_price'];
    image = json['image'];
    createdAt = json['created_at'];
    updatedAt = json['updated_at'];
  }

  int? id;
  int? coinPrice;
  String? image;
  String? createdAt;
  String? updatedAt;

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    map['id'] = id;
    map['coin_price'] = coinPrice;
    map['image'] = image;
    map['created_at'] = createdAt;
    map['updated_at'] = updatedAt;
    return map;
  }
}

class Appdata {
  Appdata({
    this.id,
    this.appName,
    this.currency,
    this.newUserFreeCoins,
    this.minThreshold,
    this.coinRate,
    this.minUserLive,
    this.maxMinuteLive,
    this.messagePrice,
    this.reverseSwipePrice,
    this.liveWatchingPrice,
    this.admobIntIos,
    this.admobBannerIos,
    this.admobInt,
    this.admobBanner,
    this.isDating,
    this.isSocialMedia,
    this.postDescriptionLimit,
    this.postUploadImageLimit,
    this.streamAndGiftCommission,
    this.createdAt,
    this.updatedAt,
  });

  Appdata.fromJson(dynamic json) {
    id = json['id'];
    appName = json['app_name'];
    currency = json['currency'];
    newUserFreeCoins = json['new_user_free_coins'];
    minThreshold = json['min_threshold'];
    coinRate = json['coin_rate'];
    minUserLive = json['min_user_live'];
    maxMinuteLive = json['max_minute_live'];
    messagePrice = json['message_price'];
    reverseSwipePrice = json['reverse_swipe_price'];
    liveWatchingPrice = json['live_watching_price'];
    admobIntIos = json['admob_int_ios'];
    admobBannerIos = json['admob_banner_ios'];
    admobInt = json['admob_int'];
    admobBanner = json['admob_banner'];
    isDating = json['is_dating'];
    isSocialMedia = json['is_social_media'];
    postDescriptionLimit = json['post_description_limit'];
    postUploadImageLimit = json['post_upload_image_limit'];
    streamAndGiftCommission = json['stream_and_gift_commission'];
    createdAt = json['created_at'];
    updatedAt = json['updated_at'];
  }

  int? id;
  String? appName;
  String? currency;
  int? newUserFreeCoins;
  int? minThreshold;
  String? coinRate;
  int? minUserLive;
  int? maxMinuteLive;
  int? messagePrice;
  int? reverseSwipePrice;
  int? liveWatchingPrice;
  String? admobIntIos;
  String? admobBannerIos;
  String? admobInt;
  String? admobBanner;
  int? isDating;
  int? isSocialMedia;
  int? postDescriptionLimit;
  int? postUploadImageLimit;
  int? streamAndGiftCommission;
  String? createdAt;
  String? updatedAt;

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    map['id'] = id;
    map['app_name'] = appName;
    map['currency'] = currency;
    map['new_user_free_coins'] = newUserFreeCoins;
    map['min_threshold'] = minThreshold;
    map['coin_rate'] = coinRate;
    map['min_user_live'] = minUserLive;
    map['max_minute_live'] = maxMinuteLive;
    map['message_price'] = messagePrice;
    map['reverse_swipe_price'] = reverseSwipePrice;
    map['live_watching_price'] = liveWatchingPrice;
    map['admob_int_ios'] = admobIntIos;
    map['admob_banner_ios'] = admobBannerIos;
    map['admob_int'] = admobInt;
    map['admob_banner'] = admobBanner;
    map['is_dating'] = isDating;
    map['is_social_media'] = isSocialMedia;
    map['post_description_limit'] = postDescriptionLimit;
    map['post_upload_image_limit'] = postUploadImageLimit;
    map['stream_and_gift_commission'] = streamAndGiftCommission;
    map['created_at'] = createdAt;
    map['updated_at'] = updatedAt;
    return map;
  }
}
