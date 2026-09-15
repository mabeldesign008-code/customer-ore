import 'package:flutter/material.dart';
import 'package:orange_ui/common/common_ui.dart';
import 'package:orange_ui/common/top_bar_area.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/screen/live_stream_history_screen/widgets/center_area_live_stream_history.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:stacked/stacked.dart';

import 'live_stream_history_screen_view_model.dart';

class LiveStreamHistory extends StatelessWidget {
  const LiveStreamHistory({super.key});

  @override
  Widget build(BuildContext context) {
    return ViewModelBuilder<LiveStreamHistoryViewModel>.reactive(
      onViewModelReady: (model) {
        model.init();
      },
      viewModelBuilder: () => LiveStreamHistoryViewModel(),
      builder: (context, model, child) {
        return Scaffold(
          backgroundColor: ColorRes.white,
          body: Column(
            children: [
              TopBarArea(title: S.current.liveStreamCap, title2: S.current.history),
              const SizedBox(height: 12),
              model.isLoading
                  ? Expanded(child: CommonUI.lottieWidget())
                  : CenterAreaLiveStream(dataList: model.liveStreamHistory, controller: model.scrollController),
            ],
          ),
        );
      },
    );
  }
}
