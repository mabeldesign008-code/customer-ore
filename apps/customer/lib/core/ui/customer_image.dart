import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:ore_core/ore_core.dart';

/// Renders both catalog-hosted media and the app's bundled fallback assets.
///
/// Catalog responses may contain an absolute URL or a gateway-relative
/// `/api/...` path. `Image.asset` silently treats the latter as a missing local
/// asset, so customer-facing catalog surfaces use this widget instead.
class CustomerImage extends StatelessWidget {
  const CustomerImage(
    this.source, {
    super.key,
    this.width,
    this.height,
    this.fit,
    this.alignment = Alignment.center,
    this.errorBuilder,
    this.fallbackAsset = 'assets/images/vendors/restaurant_nana.jpg',
    this.semanticLabel,
    this.excludeFromSemantics = false,
  });

  final String? source;
  final double? width;
  final double? height;
  final BoxFit? fit;
  final Alignment alignment;
  final ImageErrorWidgetBuilder? errorBuilder;
  final String fallbackAsset;
  final String? semanticLabel;
  final bool excludeFromSemantics;

  static String get _apiBaseUrl => OreApiClient.resolveBaseUrl(
    fileValue: dotenv.isInitialized ? dotenv.env['API_BASE_URL'] : null,
  );

  bool _isRemote(String value) {
    final uri = Uri.tryParse(value);
    return uri?.scheme == 'http' ||
        uri?.scheme == 'https' ||
        value.startsWith('/api/') ||
        value.startsWith('api/');
  }

  String _remoteUrl(String value) {
    if (value.startsWith('http://') || value.startsWith('https://'))
      return value;
    final base = _apiBaseUrl.endsWith('/') ? _apiBaseUrl : '$_apiBaseUrl/';
    return Uri.parse(
      base,
    ).resolve(value.startsWith('/') ? value.substring(1) : value).toString();
  }

  @override
  Widget build(BuildContext context) {
    final value = source?.trim();
    Widget result;
    if (value != null && value.isNotEmpty && _isRemote(value)) {
      // Cache the decoded image at ~2x the logical pixels to keep memory in
      // check on vendor/catalog lists while preserving crispness on Retina.
      final cacheWidth = width != null ? (width! * 2.5).ceil() : null;
      final cacheHeight = height != null ? (height! * 2.5).ceil() : null;
      result = Image.network(
        _remoteUrl(value),
        width: width,
        height: height,
        fit: fit,
        alignment: alignment,
        cacheWidth: cacheWidth,
        cacheHeight: cacheHeight,
        semanticLabel: semanticLabel,
        excludeFromSemantics: excludeFromSemantics || semanticLabel == null,
        filterQuality: FilterQuality.medium,
        errorBuilder:
            errorBuilder ??
            (_, __, ___) => Image.asset(
              fallbackAsset,
              width: width,
              height: height,
              fit: fit,
              alignment: alignment,
              cacheWidth: cacheWidth,
              cacheHeight: cacheHeight,
              semanticLabel: semanticLabel,
              excludeFromSemantics:
                  excludeFromSemantics || semanticLabel == null,
            ),
      );
    } else {
      result = Image.asset(
        value == null || value.isEmpty ? fallbackAsset : value,
        width: width,
        height: height,
        fit: fit,
        alignment: alignment,
        semanticLabel: semanticLabel,
        excludeFromSemantics: excludeFromSemantics || semanticLabel == null,
        errorBuilder: errorBuilder,
      );
    }
    return result;
  }
}
