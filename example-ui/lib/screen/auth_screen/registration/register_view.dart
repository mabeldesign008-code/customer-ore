import 'package:flutter/material.dart';
import 'package:orange_ui/common/custom_text_field.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/screen/auth_screen/auth_screen_view_model.dart';
import 'package:orange_ui/utils/asset_res.dart';

class RegisterView extends StatelessWidget {
  final AuthScreenViewModel viewModel;

  const RegisterView({super.key, required this.viewModel});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      child: Column(
        spacing: 20,
        children: [
          const SizedBox(height: 0),
          CustomTextField(
              controller: viewModel.fullNameController,
              title: S.of(context).fullName,
              prefixIcon: AssetRes.icProfileUser,
              textCapitalization: TextCapitalization.sentences),
          CustomTextField(
              controller: viewModel.emailController,
              title: S.of(context).emailAddress,
              prefixIcon: AssetRes.icEmail1),
          CustomTextField(
              controller: viewModel.passwordController,
              title: S.of(context).password,
              prefixIcon: AssetRes.icLock,
              suffixIcon: AssetRes.icEye),
          CustomTextField(
              controller: viewModel.confirmPasswordController,
              title: S.of(context).confirmPassword,
              prefixIcon: AssetRes.icLock,
              suffixIcon: AssetRes.icEye),
          const SizedBox(height: 1),
        ],
      ),
    );
  }
}
