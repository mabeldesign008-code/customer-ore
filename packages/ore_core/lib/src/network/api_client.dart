import 'package:dio/dio.dart';
import 'package:dio_cache_interceptor/dio_cache_interceptor.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Reads the current access token for a protected request.
///
/// The callback is asynchronous because production implementations may read
/// from platform secure storage.
typedef AccessTokenReader = Future<String?> Function();

/// Refreshes the access token after a 401. Return the new access token, or null.
typedef TokenRefresher = Future<String?> Function();

/// Shared Dio client for the Ore mobile applications.
///
/// The client is configured against the API gateway, not an individual
/// microservice. Supply the gateway origin at build time with:
///
/// ```text
/// flutter run --dart-define=API_BASE_URL=https://your-gateway.example
/// ```
///
/// Gateway routes are defined by [OreEndpoints] and include their `/api`
/// prefix. Protected requests can receive a bearer token through [setToken].
class OreApiClient {
  OreApiClient({
    String? baseUrl,
    String? token,
    this.accessTokenReader,
    this.tokenRefresher,
  })  : baseUrl = _normalizeBaseUrl(baseUrl ?? defaultBaseUrl) {
    final headers = <String, dynamic>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }

    _dio = Dio(
      BaseOptions(
        baseUrl: this.baseUrl,
        connectTimeout: _networkTimeout,
        receiveTimeout: _networkTimeout,
        sendTimeout: _networkTimeout,
        headers: headers,
        // Require valid certificates always. We deliberately do NOT set
        // validateStatus or badCertificateCallback permissively — all TLS
        // validation is left to the OS/browser. Certificate pinning is
        // enforced at platform level (Android network_security_config.xml
        // + iOS TrustKit/SwkSSLPinning) to MITM-proof production traffic.
        followRedirects: true,
        maxRedirects: 5,
        responseType: ResponseType.json,
      ),
    );

    // The cache interceptor is useful for read-heavy screens. The debug log
    // interceptor intentionally excludes bodies so tokens and user data are
    // not written to logs during development.
    _dio.interceptors.addAll([
      DioCacheInterceptor(options: _cacheOptions),
      if (accessTokenReader != null || tokenRefresher != null)
        _BearerTokenInterceptor(readAccessToken: accessTokenReader, refresher: tokenRefresher),
      if (kDebugMode)
        LogInterceptor(
          responseBody: false,
          requestBody: false,
          error: true,
          logPrint: (message) => debugPrint(message.toString()),
        ),
    ]);
  }

  /// Compile-time `--dart-define=API_BASE_URL=...` value. Empty when unset.
  static const String definedBaseUrl = String.fromEnvironment('API_BASE_URL');

  /// Build-time default used when the app is launched without an override.
  ///
  /// Deployments should always provide their verified gateway origin through
  /// `--dart-define=API_BASE_URL=...` or a `.env` `API_BASE_URL`. The fallback
  /// is only used when neither is set.
  static const String defaultBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://api-staging.ore.delivery',
  );

  /// Resolves the gateway origin. `--dart-define` wins, then [fileValue]
  /// (typically `dotenv.env['API_BASE_URL']`), then [defaultBaseUrl].
  static String resolveBaseUrl({String? fileValue}) {
    if (definedBaseUrl.trim().isNotEmpty) return _normalizeBaseUrl(definedBaseUrl);
    if (fileValue != null && fileValue.trim().isNotEmpty) {
      return _normalizeBaseUrl(fileValue);
    }
    return _normalizeBaseUrl(defaultBaseUrl);
  }

  static const Duration _networkTimeout = Duration(seconds: 30);

  final String baseUrl;
  final AccessTokenReader? accessTokenReader;
  final TokenRefresher? tokenRefresher;
  late final Dio _dio;

  final _cacheOptions = CacheOptions(
    store: MemCacheStore(),
    policy: CachePolicy.noCache,
    hitCacheOnErrorExcept: const <int>[],
    maxStale: const Duration(minutes: 5),
  );

  /// Updates the bearer token used by subsequent protected requests.
  void setToken(String? token) {
    if (token == null || token.isEmpty) {
      _dio.options.headers.remove('Authorization');
    } else {
      _dio.options.headers['Authorization'] = 'Bearer $token';
    }
  }

  Dio get dio => _dio;

  /// Calls the public API-gateway health endpoint.
  ///
  /// The returned [Response] is intentionally exposed so callers/tests can
  /// inspect the status code and response body. Network and HTTP failures are
  /// surfaced as [DioException] and should be handled at the application
  /// boundary rather than swallowed here.
  Future<Response<Map<String, dynamic>>> testConnection() {
    return getFresh<Map<String, dynamic>>('/health');
  }

  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? query,
    Options? options,
  }) =>
      _dio.get<T>(path, queryParameters: query, options: options);

  /// Performs a GET while bypassing the in-memory cache.
  ///
  /// Use this for identity/session probes and other responses that must never
  /// be reused across users.
  Future<Response<T>> getFresh<T>(
    String path, {
    Map<String, dynamic>? query,
  }) {
    final freshOptions = _cacheOptions
        .copyWith(policy: CachePolicy.noCache)
        .toOptions();
    return _dio.get<T>(
      path,
      queryParameters: query,
      options: freshOptions,
    );
  }

  Future<Response<T>> post<T>(
    String path, {
    Object? data,
    Map<String, dynamic>? query,
  }) =>
      _dio.post<T>(path, data: data, queryParameters: query);

  Future<Response<T>> put<T>(String path, {Object? data}) =>
      _dio.put<T>(path, data: data);

  Future<Response<T>> patch<T>(String path, {Object? data}) =>
      _dio.patch<T>(path, data: data);

  Future<Response<T>> delete<T>(String path, {Object? data}) =>
      _dio.delete<T>(path, data: data);
}

class _BearerTokenInterceptor extends Interceptor {
  _BearerTokenInterceptor({this.readAccessToken, this.refresher});

  final AccessTokenReader? readAccessToken;
  final TokenRefresher? refresher;
  bool _refreshing = false;

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final existingAuthorization =
        options.headers['Authorization'] ?? options.headers['authorization'];
    if (existingAuthorization is String &&
        existingAuthorization.trim().isNotEmpty) {
      handler.next(options);
      return;
    }

    try {
      final token = await readAccessToken?.call();
      if (token != null && token.isNotEmpty) {
        options.headers['Authorization'] = 'Bearer $token';
      }
    } catch (_) {}

    handler.next(options);
  }

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    final status = err.response?.statusCode;
    final path = err.requestOptions.path;
    if (status != 401 || refresher == null || _refreshing || path.contains('/auth/refresh')) {
      handler.next(err);
      return;
    }
    _refreshing = true;
    try {
      final next = await refresher!();
      if (next == null || next.isEmpty) {
        handler.next(err);
        return;
      }
      final req = err.requestOptions;
      req.headers['Authorization'] = 'Bearer $next';
      final response = await Dio(BaseOptions(
        baseUrl: req.baseUrl,
        connectTimeout: req.connectTimeout,
        receiveTimeout: req.receiveTimeout,
        sendTimeout: req.sendTimeout,
      )).fetch(req);
      handler.resolve(response);
    } catch (_) {
      handler.next(err);
    } finally {
      _refreshing = false;
    }
  }
}

String _normalizeBaseUrl(String value) {
  final trimmed = value.trim();
  if (trimmed.isEmpty) return OreApiClient.defaultBaseUrl;
  return trimmed.endsWith('/')
      ? trimmed.substring(0, trimmed.length - 1)
      : trimmed;
}

final apiClientProvider = Provider<OreApiClient>((ref) {
  return OreApiClient();
});

/// Persistent-preferences-backed local settings helper.
class PrefsService {
  PrefsService._();
  static SharedPreferences? _prefs;
  static Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
  }

  static SharedPreferences get instance {
    assert(_prefs != null, 'PrefsService.init() not called');
    return _prefs!;
  }
}
