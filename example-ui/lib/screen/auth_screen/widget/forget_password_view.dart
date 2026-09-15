import 'package:flutter/material.dart';
import 'package:orange_ui/common/button/custom_text_button.dart';
import 'package:orange_ui/common/custom_text_field.dart';
import 'package:orange_ui/common/login_setup_view.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/screen/auth_screen/auth_screen_view_model.dart';
import 'package:orange_ui/utils/asset_res.dart';

class ForgetPasswordView extends StatelessWidget {
  final AuthScreenViewModel viewModel;

  const ForgetPasswordView({super.key, required this.viewModel});

  @override
  Widget build(BuildContext context) {
    return LoginSetupView(
      title: S.of(context).resetYourPasswordAndRegainAccess,
      description: S.of(context).noWorriesLetsHelpYouResetIt,
      child: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              child: CustomTextField(
                  controller: viewModel.emailController,
                  title: S.current.emailAddress,
                  prefixIcon: AssetRes.icEmail1),
            ),
          ),
          CustomTextButton(
              onTap: viewModel.onForgetPassword, title: S.current.reset)
        ],
      ),
    );
  }
}
