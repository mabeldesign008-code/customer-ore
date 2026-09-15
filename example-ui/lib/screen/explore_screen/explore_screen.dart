import 'package:flutter/material.dart';
import 'package:orange_ui/screen/explore_screen/explore_screen_view_model.dart';
import 'package:orange_ui/screen/explore_screen/widgets/bottom_bottons.dart';
import 'package:orange_ui/screen/explore_screen/widgets/full_image_view.dart';
import 'package:stacked/stacked.dart';

class ExploreScreen extends StatelessWidget {
  const ExploreScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ViewModelBuilder<ExploreScreenViewModel>.reactive(
      onViewModelReady: (model) {
        model.init();
      },
      viewModelBuilder: () => ExploreScreenViewModel(),
      builder: (context, model, child) {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          spacing: 20,
          children: [
            FullImageView(model: model),
            if (model.combinedList.isNotEmpty) BottomButtons(model: model),
          ],
        );
      },
    );
  }
}
