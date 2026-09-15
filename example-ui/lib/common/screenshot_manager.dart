import 'dart:developer';
import 'dart:io';
import 'dart:ui';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';

class ScreenshotManager {
  /// Capture widget screenshot
  static Future<XFile?> captureScreenshot(GlobalKey screenshotKey) async {
    try {
      RenderRepaintBoundary? boundary = screenshotKey.currentContext
          ?.findRenderObject() as RenderRepaintBoundary?;
      if (boundary == null) return null;

      final image = await boundary.toImage(pixelRatio: 5.0);
      final byteData = await image.toByteData(format: ImageByteFormat.png);
      final Uint8List? imageBytes = byteData?.buffer.asUint8List();
      if (imageBytes == null) return null;

      // Use app documents directory for both iOS and Android
      Directory directory = await getApplicationDocumentsDirectory();
      final localPath = directory.path;

      final filePath = '$localPath/screenshot.png';
      final file = File(filePath);

      await file.writeAsBytes(imageBytes);
      log('✅ Screenshot saved: $filePath');
      return XFile(filePath);
    } catch (e) {
      log('❌ Screenshot failed: $e');
      return null;
    }
  }
}
