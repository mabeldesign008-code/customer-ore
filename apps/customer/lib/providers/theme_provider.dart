import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ThemeModeNotifier extends Notifier<ThemeMode> {
  static const _key = 'customer_theme_mode';

  @override
  ThemeMode build() {
    _load();
    return ThemeMode.system;
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key);
    if (raw == null) return;
    switch (raw) {
      case 'light':
        state = ThemeMode.light;
        break;
      case 'dark':
        state = ThemeMode.dark;
        break;
      default:
        state = ThemeMode.system;
    }
  }

  Future<void> setTheme(ThemeMode mode) async {
    state = mode;
    final prefs = await SharedPreferences.getInstance();
    String raw = 'system';
    switch (mode) {
      case ThemeMode.light:
        raw = 'light';
        break;
      case ThemeMode.dark:
        raw = 'dark';
        break;
      case ThemeMode.system:
        raw = 'system';
        break;
    }
    await prefs.setString(_key, raw);
  }

  void toggle() {
    if (state == ThemeMode.dark) {
      setTheme(ThemeMode.light);
    } else if (state == ThemeMode.light) {
      setTheme(ThemeMode.dark);
    } else {
      // follow system → switch to explicit light
      setTheme(ThemeMode.light);
    }
  }
}

final themeModeProvider =
    NotifierProvider<ThemeModeNotifier, ThemeMode>(ThemeModeNotifier.new);
