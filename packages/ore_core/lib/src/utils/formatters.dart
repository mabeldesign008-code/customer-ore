import 'package:intl/intl.dart';

class Formatters {
  Formatters._();

  static const String currencyGHS = '₵';

  static String money(double amount, {String symbol = currencyGHS}) {
    final fmt = NumberFormat.currency(
      locale: 'en_GH',
      symbol: symbol,
      decimalDigits: amount.truncateToDouble() == amount ? 0 : 2,
    );
    return fmt.format(amount);
  }

  static String timeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inSeconds < 60) return 'just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return DateFormat('MMM d').format(dt);
  }

  static String etaFromMinutes(int minutes) {
    if (minutes < 60) return '$minutes min';
    final h = minutes ~/ 60;
    final m = minutes % 60;
    if (m == 0) return '$h hr';
    return '$h hr $m min';
  }

  static String formatDate(DateTime dt) => DateFormat('EEE, MMM d · h:mm a').format(dt);
}
