import 'dart:developer';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/api_provider/api_provider.dart';
import 'package:orange_ui/common/common_fun.dart';
import 'package:orange_ui/common/common_ui.dart';
import 'package:orange_ui/common/confirmation_dialog.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/search/filter_profile_model.dart';
import 'package:orange_ui/model/setting_model.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/screen/create_profile_screen/create_profile_screen_view_model.dart';
import 'package:orange_ui/screen/find_match_profile/widget/filter_sheet.dart';
import 'package:orange_ui/screen/find_match_profile/widget/your_matching_sheet.dart';
import 'package:orange_ui/screen/notification_screen/notification_screen.dart';
import 'package:orange_ui/screen/search_screen/search_screen.dart';
import 'package:orange_ui/screen/user_detail_screen/user_detail_screen.dart';
import 'package:orange_ui/service/extention/string_extention.dart';
import 'package:orange_ui/service/session_manager.dart';
import 'package:orange_ui/utils/app_res.dart';
import 'package:orange_ui/utils/urls.dart';
import 'package:stacked/stacked.dart';

class FindMatchProfileViewModel extends BaseViewModel {
  UserData? myProfile = SessionManager.instance.getUser();
  List<UserData> filterUsers = [];
  UserData? myUserData = SessionManager.instance.getUser();
  GenderType selectedGenderPref = GenderType.male;
  RangeValues selectedAgeRange = const RangeValues(18, 35);
  double selectedDistance = 25;
  List<Interests> interestList = [];
  List<Interests> selectedInterests = [];

  List<RelationshipGoals> relationshipGoals = [];
  RelationshipGoals? selectedRelationShipGoal;
  Religions? selectedReligion;
  List<Religions> religions = [];
  List<Language> languages = [];
  List<Language> selectedLanguages = [];
  bool isLoading = false;
  bool hasNoMoreUser = false;
  PageController pageController = PageController();
  int currentUserIndex = 0;

  void init() {
    getInterestApiCall();
    filteredProfilesApi(reset: true);
  }

  void getInterestApiCall() {
    SettingData? settingData = SessionManager.instance.getSettings();
    interestList = (settingData?.interests ?? [])
        .where((element) => element.isDeleted == 0)
        .toList();
    relationshipGoals = (settingData?.relationshipGoals ?? [])
        .where((element) => element.isDeleted == 0)
        .toList();
    religions = (settingData?.religions ?? [])
        .where((element) => element.isDeleted == 0)
        .toList();
    languages = (settingData?.language ?? [])
        .where((element) => element.isDeleted == 0)
        .toList();
    notifyListeners();
    getLocalData();
  }

  void getLocalData() async {
    UserData? data = myUserData;
    if (data == null) return;
    selectedGenderPref = data.genderPreferred;
    selectedAgeRange = RangeValues(
        data.agePreferredMin?.toDouble() ?? AppRes.ageMin,
        data.agePreferredMax?.toDouble() ?? AppRes.ageMax);
    selectedDistance = data.distancePreference?.toDouble() ?? 0.0;

    data.interests?.split(',').forEach((id) {
      final interest = interestList.firstWhereOrNull(
          (element) => element.id == int.parse(id) && element.isDeleted == 0);
      if (interest != null) {
        selectedInterests.add(interest);
      }
    });
    selectedRelationShipGoal = relationshipGoals.firstWhereOrNull((element) =>
        element.isDeleted == 0 && element.id == data.relationshipGoalId);
    selectedReligion = religions.firstWhereOrNull((element) {
      return element.isDeleted == 0 &&
          element.title?.removeEmojis.trim() == data.religionKey;
    });
    data.languageKeys?.split(',').forEach((id) {
      final language = languages.firstWhereOrNull((element) =>
          (element.title?.removeEmojis)?.trim() == id.trim() &&
          element.isDeleted == 0);
      if (language != null) {
        selectedLanguages.add(language);
      }
    });
    notifyListeners();
  }

  void onNotificationTap() {
    CommonFun.isBloc(
      myProfile,
      onCompletion: () {
        Get.to(() => const NotificationScreen());
      },
    );
  }

  void onSearchTap() {
    CommonFun.isBloc(
      myProfile,
      onCompletion: () {
        Get.to(() => const SearchScreen());
      },
    );
  }

  void onFilterChange() {
    Get.bottomSheet(FilterSheet(model: this), isScrollControlled: true);
  }

  void onChangeGenderPref(GenderType type) {
    selectedGenderPref = type;
    notifyListeners();
  }

  void onChangeAgeRange(RangeValues value) {
    selectedAgeRange = value;
    notifyListeners();
  }

  void onChangeDistance(double value) {
    selectedDistance = value;
    notifyListeners();
  }

  onSelectInterestTap(Interests interest) {
    final id = interest.id;
    if (id == null) return;

    final isAlreadySelected = selectedInterests.any((e) => e.id == id);

    if (isAlreadySelected) {
      selectedInterests.removeWhere((e) => e.id == id);
    } else {
      selectedInterests.add(interest);
    }

    notifyListeners();
  }

  onRelationshipGoalTap(RelationshipGoals goal) {
    if (selectedRelationShipGoal?.id == goal.id) {
      selectedRelationShipGoal = null;
    } else {
      selectedRelationShipGoal = goal;
    }
    notifyListeners();
  }

  onReligionTap(Religions religion) {
    if (selectedReligion?.id == religion.id) {
      selectedReligion = null;
    } else {
      selectedReligion = religion;
    }
    notifyListeners();
  }

  onLanguagesTap(Language language) {
    final id = language.id;
    if (id == null) return;

    final isAlreadySelected = selectedLanguages.any((e) => e.id == id);

    if (isAlreadySelected) {
      selectedLanguages.removeWhere((e) => e.id == id);
    } else {
      selectedLanguages.add(language);
    }

    notifyListeners();
  }

  void filteredProfilesApi({bool reset = false}) {
    if (reset == true) {
      filterUsers.clear();
      currentUserIndex = 0;
      hasNoMoreUser = false;
    }
    if (hasNoMoreUser) return;
    isLoading = true;
    notifyListeners();
    ApiProvider().callPost(
      completion: (response) {
        isLoading = false;
        FilterProfileModel result = FilterProfileModel.fromJson(response);
        log("Matched Profile : ${result.data.length.toString()}");
        if (result.status == true) {
          if (result.data.isNotEmpty) {
            filterUsers.addAll(result.data);
          }
        }
        if (result.data.length < AppRes.paginationLimit) {
          hasNoMoreUser = true;
        }
        notifyListeners();
      },
      url: Urls.aFilteredProfiles,
      param: {
        Urls.aStart: filterUsers.length.toString(),
        Urls.aLimit: AppRes.paginationLimit.toString(),
        Urls.myUserId: SessionManager.instance.getUserID(),
        Urls.gender: selectedGenderPref.value,
        Urls.agePreferredMin: selectedAgeRange.start.toInt(),
        Urls.agePreferredMax: selectedAgeRange.end.toInt(),
        Urls.distancePreference: selectedDistance.toInt(),
        if (selectedRelationShipGoal != null)
          Urls.relationshipGoalId: selectedRelationShipGoal?.id,
        if (selectedReligion != null)
          Urls.religionKey: selectedReligion!.title?.removeEmojis,
        if (selectedInterests.isNotEmpty)
          Urls.interests: selectedInterests.map((e) => e.id).toList().join(','),
        if (selectedLanguages.isNotEmpty)
          Urls.languageKeys: selectedLanguages
              .map((e) => e.title?.removeEmojis)
              .toList()
              .join(','),
      },
    );
  }

  void hideProfile() {
    Get.dialog(
      ConfirmationDialog(
        onTap: () async {
          Get.back();
          UserData matchedUser = filterUsers[currentUserIndex];

          myUserData = SessionManager.instance.getUser();

          List<String> hiddenIds =
              myUserData?.hiddenUserIds?.trim().split(',') ?? [];
          if (!hiddenIds.contains(matchedUser.id.toString())) {
            hiddenIds.add(matchedUser.id.toString());
          }
          CommonUI.lottieLoader();
          UserModel model = await ApiProvider()
              .updateProfile(hiddenUserIds: hiddenIds.join(','));
          Get.back();
          if (model.status == true) {
            filterUsers.removeWhere((element) => element.id == matchedUser.id);
            notifyListeners();
          } else {
            CommonUI.snackBar(message: model.message ?? '');
          }
        },
        description: S.current.doYouReallyWantToHideThisProfileOnceHidden,
        dialogSize: 1.5,
        textButton: S.current.hide,
      ),
    );
  }

  void onPageChanged(int value) {
    currentUserIndex = value;
    notifyListeners();
  }

  void yourMatching() {
    UserData matchedUser = filterUsers[currentUserIndex];
    Get.bottomSheet(YourMatchingSheet(model: this, matchedUser: matchedUser),
        isScrollControlled: true);
  }

  void goToProfileTap() {
    UserData matchedUser = filterUsers[currentUserIndex];
    Get.to(() => UserDetailScreen(userData: matchedUser));
  }

  void onNextProfileTap() {
    if (currentUserIndex < filterUsers.length - 1) {
      currentUserIndex++;
      pageController.nextPage(
          duration: const Duration(milliseconds: 250), curve: Curves.linear);

      if (currentUserIndex >= filterUsers.length - 3) {
        filteredProfilesApi();
      }
    } else {
      filterUsers.clear();
    }
    notifyListeners();
  }
}
