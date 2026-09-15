import 'package:flutter/material.dart';
import 'package:orange_ui/common/common_ui.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/social/post/add_comment.dart';
import 'package:orange_ui/model/social/post/fetch_comment.dart';
import 'package:orange_ui/screen/comment_sheet/comment_sheet_view_model.dart';
import 'package:orange_ui/screen/comment_sheet/widget/bottom_comment_field.dart';
import 'package:orange_ui/screen/comment_sheet/widget/comment_card.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';
import 'package:stacked/stacked.dart';

class CommentSheet extends StatelessWidget {
  final Post? post;

  const CommentSheet({super.key, required this.post});

  @override
  Widget build(BuildContext context) {
    return ViewModelBuilder<CommentSheetViewModel>.reactive(
      onViewModelReady: (viewModel) => viewModel.init(),
      viewModelBuilder: () => CommentSheetViewModel(post),
      builder: (context, model, child) {
        return Container(
          margin: EdgeInsets.only(top: AppBar().preferredSize.height * 1.3),
          decoration: const ShapeDecoration(
            color: ColorRes.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.vertical(top: Radius.circular(40)),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Padding(
                  padding: const EdgeInsets.only(top: 20.0, bottom: 10),
                  child: Text(
                    S.of(context).comments,
                    style: const TextStyle(color: ColorRes.davyGrey, fontFamily: FontRes.bold, fontSize: 18),
                  ),
                ),
              ),
              const Divider(color: ColorRes.borderColor, thickness: 1),
              Expanded(
                child: model.isLoading
                    ? CommonUI.lottieWidget()
                    : model.comments.isEmpty
                        ? CommonUI.noData(title: '${S.of(context).noComment}!!')
                        : ListView.builder(
                            controller: model.scrollController,
                            itemCount: model.comments.length,
                            padding: EdgeInsets.zero,
                            itemBuilder: (context, index) {
                              CommentData commentData = model.comments[index];
                              return CommentCard(
                                commentData: commentData,
                                model: model,
                              );
                            }),
              ),
              BottomCommentField(model: model)
            ],
          ),
        );
      },
    );
  }
}
