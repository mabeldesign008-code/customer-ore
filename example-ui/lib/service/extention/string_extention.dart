import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:orange_ui/common/dominant_color.dart';
import 'package:orange_ui/utils/const_res.dart';

extension StringExtention on String {
  String addBaseURL() {
    return (ConstRes.aImageBaseUrl) + this;
  }

  String get removeEmojis {
    final emojiRegex = RegExp(
        r'[\u{1F600}-\u{1F64F}' // Emoticons
        r'\u{1F300}-\u{1F5FF}' // Symbols & Pictographs
        r'\u{1F680}-\u{1F6FF}' // Transport & Map Symbols
        r'\u{2600}-\u{26FF}' // Misc symbols
        r'\u{2700}-\u{27BF}' // Dingbats
        r'\u{FE00}-\u{FE0F}' // Variation Selectors
        r'\u{1F900}-\u{1F9FF}' // Supplemental Symbols and Pictographs
        r'\u{1F1E6}-\u{1F1FF}' // Flags
        r'\u{1F700}-\u{1F77F}]', // Alchemical symbols
        unicode: true);

    return replaceAll(emojiRegex, '');
  }

  int get dateTimeToAge {
    DateTime birthDate = DateTime.parse(this);
    final today = DateTime.now();
    int age = today.year - birthDate.year;

    if (today.month < birthDate.month ||
        (today.month == birthDate.month && today.day < birthDate.day)) {
      age--;
    }

    return age;
  }

  Future<LinearGradient> get getGradientFromImage async {
    List<Color> colors = [];
    Uint8List imageBytes = await File(this).readAsBytes();
    try {
      DominantColors extractor =
          DominantColors(bytes: imageBytes, dominantColorsCount: 5);

      List<Color> dominantColors = extractor.extractDominantColors();
      colors = dominantColors;
    } catch (e) {
      colors.clear();
    }

    return LinearGradient(
      begin: Alignment.topCenter,
      end: Alignment.bottomCenter,
      stops: const [0.1, 1],
      colors: [colors.first, colors.last],
    );
  }
}
