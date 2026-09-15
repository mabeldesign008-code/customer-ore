import 'dart:async';
import 'dart:io';

import 'package:get/get.dart';
import 'package:orange_ui/api_provider/api_provider.dart';
import 'package:orange_ui/screen/restart_app/restart_app.dart';
import 'package:orange_ui/service/session_manager.dart';
import 'package:stacked/stacked.dart';

class LanguagesScreenViewModel extends BaseViewModel {
  static String selectedLanguage = Platform.localeName.split('_')[0];

  int? value = 0;
  List<String> languages = [
    'عربي',
    'dansk',
    'Nederlands',
    'English',
    'Français',
    'Deutsch',
    'Ελληνικά',
    'हिंदी',
    'bahasa Indonesia',
    'Italiano',
    '日本',
    '한국인',
    'Norsk Bokmal',
    'Polski',
    'Português',
    'Русский',
    '简体中文',
    'Español',
    'แบบไทย',
    'Türkçe',
    'Tiếng Việt',
  ];
  List<String> subLanguage = [
    'Arabic',
    'Danish',
    'Dutch',
    'English',
    'French',
    'German',
    'Greek',
    'Hindi',
    'Indonesian',
    'Italian',
    'Japanese',
    'Korean',
    'Norwegian Bokmal',
    'Polish',
    'Portuguese',
    'Russian',
    'Simplified Chinese',
    'Spanish',
    'Thai',
    'Turkish',
    'Vietnamese',
  ];
  List languageCode = [
    'ar',
    'da',
    'nl',
    'en',
    'fr',
    'de',
    'el',
    'hi',
    'id',
    'it',
    'ja',
    'ko',
    'nb',
    'pl',
    'pt',
    'ru',
    'zh',
    'es',
    'th',
    'tr',
    'vi',
  ];

  void init() {
    prefData();
  }

  Timer? _timer;

  void onLanguageChange(int? value) async {
    this.value = value;
    SessionManager.instance.setString(
        key: SessionKeys.languageCode, value: languageCode[value ?? 0]);
    selectedLanguage = languageCode[value ?? 0];
    RestartWidget.restartApp(Get.context!);
    notifyListeners();
    ApiProvider().updateProfile(appLanguage: selectedLanguage);
  }

  void prefData() async {
    selectedLanguage =
        SessionManager.instance.getString(key: SessionKeys.languageCode) ??
            Platform.localeName.split('_')[0];
    value = languageCode.indexOf(selectedLanguage);
    notifyListeners();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }
}
