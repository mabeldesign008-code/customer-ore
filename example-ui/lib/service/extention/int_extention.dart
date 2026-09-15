import 'package:intl/intl.dart';

extension IntExtention on int {
  String get numberFormat => NumberFormat.compact().format(this);
}

extension NumExtention on num {
  String get numberFormat => NumberFormat.compact().format(this);
}
