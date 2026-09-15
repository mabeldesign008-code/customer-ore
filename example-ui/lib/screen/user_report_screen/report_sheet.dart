import 'package:flutter/material.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/screen/user_report_screen/report_sheet_view_model.dart';
import 'package:orange_ui/screen/user_report_screen/widget/report_card.dart';
import 'package:stacked/stacked.dart';

class ReportSheet extends StatelessWidget {
  final int? reportId;
  final UserData? userData;
  final String? profileImage;
  final int? age;
  final String? fullName;
  final String? address;
  final int reportType;

  const ReportSheet({super.key,
      required this.reportId,
      this.userData,
      required this.profileImage,
      required this.age,
      required this.fullName,
      required this.address,
      required this.reportType});

  @override
  Widget build(BuildContext context) {
    return ViewModelBuilder<ReportSheetViewModel>.reactive(
      onViewModelReady: (model) {
        model.init();
      },
      viewModelBuilder: () => ReportSheetViewModel(reportId ?? -1, reportType),
      builder: (context, model, child) {
        return GestureDetector(
          onTap: () {
            model.explainMoreFocus.unfocus();
          },
          child: ReportCard(
              fullName: '$fullName',
              age: age,
              profileImage: profileImage,
              address: address ?? '',
              model: model,
              reportType: reportType),
        );
      },
    );
  }
}
