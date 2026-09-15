import 'package:flutter/cupertino.dart';
import 'package:get/get.dart';
import 'package:orange_ui/api_provider/api_provider.dart';
import 'package:orange_ui/model/chat_and_live_stream/fetch_live_stream_history.dart';
import 'package:stacked/stacked.dart';

class LiveStreamHistoryViewModel extends BaseViewModel {
  List<FetchLiveStreamHistoryData>? liveStreamHistory = [];
  bool isLoading = false;
  int currentPage = 0;
  ScrollController scrollController = ScrollController();

  void init() {
    fetchNextPage();
    fetchLiveStreamApiCall();
  }

  void fetchNextPage() {
    scrollController.addListener(() {
      if (scrollController.offset ==
          scrollController.position.maxScrollExtent) {
        if (!isLoading) {
          fetchLiveStreamApiCall();
        } else {}
      }
    });
  }

  void fetchLiveStreamApiCall() {
    isLoading = true;
    ApiProvider().fetchAllLiveStreamHistory(currentPage).then((value) {
      if (currentPage == 0) {
        liveStreamHistory = value.data;
      } else {
        liveStreamHistory?.addAll(value.data!);
      }
      currentPage = liveStreamHistory!.length;
      isLoading = false;
      notifyListeners();
    });
  }

  void onBackBtnTap() {
    Get.back();
  }
}
