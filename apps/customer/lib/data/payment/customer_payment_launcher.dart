import 'package:url_launcher/url_launcher.dart';

/// Opens a Paystack authorization URL when the backend is running in live
/// payment mode. Mock mode intentionally returns no URL; checkout orders and
/// wallet top-ups stay pending until the payment test webhook/mock completion
/// is performed. The app must not credit locally.
Future<bool> openCustomerPayment(String? rawUrl) async {
  if (rawUrl == null || rawUrl.trim().isEmpty) return false;
  final uri = Uri.tryParse(rawUrl.trim());
  if (uri == null || !{'http', 'https'}.contains(uri.scheme.toLowerCase())) return false;
  if (!await canLaunchUrl(uri)) return false;
  return launchUrl(uri, mode: LaunchMode.externalApplication);
}
