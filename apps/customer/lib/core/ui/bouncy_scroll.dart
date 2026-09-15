import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';

/// Applies iOS-style bouncing overscroll everywhere + hides scrollbars by default.
///
/// Applied globally via [MaterialApp.scrollBehavior] so we don't have to set
/// [BouncingScrollPhysics] on every [ListView]/[CustomScrollView].
class OreScrollBehavior extends MaterialScrollBehavior {
  const OreScrollBehavior();

  @override
  ScrollPhysics getScrollPhysics(BuildContext context) =>
      const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics());

  @override
  Set<PointerDeviceKind> get dragDevices => {
        PointerDeviceKind.touch,
        PointerDeviceKind.mouse,
        PointerDeviceKind.stylus,
        PointerDeviceKind.trackpad,
        PointerDeviceKind.invertedStylus,
        PointerDeviceKind.unknown,
      };
}
