import 'package:flutter/material.dart';
import 'package:orange_ui/common/custom_text_field.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/screen/auth_screen/auth_screen_view_model.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';

class LoginView extends StatelessWidget {
  final AuthScreenViewModel viewModel;

  const LoginView({super.key, required this.viewModel});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      child: Column(
        spacing: 20,
        children: [
          const SizedBox(height: 0),
          CustomTextField(
              controller: viewModel.emailController,
              title: S.of(context).emailAddress,
              prefixIcon: AssetRes.icEmail1),
          CustomTextField(
              controller: viewModel.passwordController,
              title: S.of(context).password,
              prefixIcon: AssetRes.icLock,
              suffixIcon: AssetRes.icEye),
          Align(
            alignment: AlignmentDirectional.centerEnd,
            child: InkWell(
              onTap: viewModel.onForgotPasswordTap,
              child: Text(
                S.of(context).forgotPassword,
                style: const TextStyle(
                    color: ColorRes.darkGrey, fontFamily: FontRes.medium),
              ),
            ),
          )
        ],
      ),
    );
  }
}
