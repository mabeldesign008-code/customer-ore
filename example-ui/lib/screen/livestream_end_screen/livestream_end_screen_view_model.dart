import 'package:intl/intl.dart';
import 'package:orange_ui/api_provider/api_provider.dart';
import 'package:orange_ui/model/chat_and_live_stream/live_stream.dart';
import 'package:stacked/stacked.dart';

class LivestreamEndScreenViewModel extends BaseViewModel {
  void init(LiveStreamUser liveStreamUser, String dateTime, String duration) {
    if ((liveStreamUser.collectedDiamond ?? 0) > 0) {
      ApiProvider().addCoinFromWallet(liveStreamUser.collectedDiamond ?? 0);
    }
    ApiProvider().addLiveStreamHistory(
        amountCollected: '${(liveStreamUser.collectedDiamond ?? 0).toInt()}',
        startedAt: DateFormat('h:mm a').format(DateTime.parse(dateTime)),
        streamFor: this.dateTime(duration));
  }

  String dateTime(String date) {
    List<String> parts = date.split(':');
    int hours = int.parse(parts[0]);
    int minutes = int.parse(parts[1]);
    int seconds = int.parse(parts[2]);

    if (hours == 0 && minutes == 0) {
      return '$seconds sec';
    }
    if (hours == 0) {
      return '$minutes mins $seconds sec';
    }
    return '$hours hr $minutes mins';
  }
}
