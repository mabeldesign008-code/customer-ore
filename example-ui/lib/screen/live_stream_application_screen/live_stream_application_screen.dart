import 'package:flutter/material.dart';
import 'package:orange_ui/common/top_bar_area.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/screen/live_stream_application_screen/widgets/center_area_livestream.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';
import 'package:orange_ui/utils/style_res.dart';
import 'package:stacked/stacked.dart';

import 'live_stream_application_screen_view_model.dart';

class LiveStreamApplicationScreen extends StatelessWidget {
  const LiveStreamApplicationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ViewModelBuilder<LiveStreamApplicationScreenViewModel>.reactive(
      onViewModelReady: (model) {
        model.init();
      },
      viewModelBuilder: () => LiveStreamApplicationScreenViewModel(),
      builder: (context, model, child) {
        return Scaffold(
          backgroundColor: ColorRes.white,
          body: Column(
            children: [
              TopBarArea(
                title: S.current.liveStreamCap,
                title2: S.current.application,
              ),
              CenterAreaLiveStream(model: model),
              InkWell(
                onTap: model.onSubmitBtnTap,
                child: Container(
                  height: 48,
                  margin: const EdgeInsets.symmetric(horizontal: 15),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(30),
                    gradient: StyleRes.linearGradient,
                  ),
                  child: Center(
                    child: Text(S.current.submit,
                        style:
                            const TextStyle(color: ColorRes.white, fontFamily: FontRes.semiBold, letterSpacing: 0.5)),
                  ),
                ),
              ),
              SizedBox(height: AppBar().preferredSize.height / 2)
            ],
          ),
        );
      },
    );
  }
}
