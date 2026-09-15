import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/screen/splash_screen/splash_screen_view_model.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:stacked/stacked.dart';

class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ViewModelBuilder<SplashScreenViewModel>.reactive(
      onViewModelReady: (viewModel) => viewModel.init(),
      viewModelBuilder: () => SplashScreenViewModel(),
      builder: (context, viewModel, child) {
        return Scaffold(
          body: Center(
            child: Image.asset(AssetRes.themeLabel,
                width: Get.width / 2, height: 100),
          ),
        );
      },
    );
  }
}
