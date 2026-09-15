import 'package:intl/intl.dart';

extension DatetimeExtention on DateTime {
  String get dobFormat {
    return DateFormat('yyyy-MM-dd').format(this);
  }

  int get dateTimeToAge {
    DateTime birthDate = this;
    final today = DateTime.now();
    int age = today.year - birthDate.year;

    if (today.month < birthDate.month ||
        (today.month == birthDate.month && today.day < birthDate.day)) {
      age--;
    }

    return age;
  }
}
