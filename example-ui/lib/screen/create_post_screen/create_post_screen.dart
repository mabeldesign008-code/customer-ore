import 'package:flutter/material.dart';
import 'package:orange_ui/screen/create_post_screen/create_post_screen_view_model.dart';
import 'package:orange_ui/screen/create_post_screen/widget/creat_post_page.dart';
import 'package:orange_ui/screen/create_post_screen/widget/create_post_top_bar_view.dart';
import 'package:orange_ui/screen/create_post_screen/widget/post_page.dart';
import 'package:stacked/stacked.dart';

class CreatePostScreen extends StatelessWidget {
  const CreatePostScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ViewModelBuilder<CreatePostScreenViewModel>.reactive(
      onViewModelReady: (viewModel) {
        viewModel.init();
      },
      viewModelBuilder: () => CreatePostScreenViewModel(),
      builder: (context, model, child) => Container(
        padding: EdgeInsets.only(top: AppBar().preferredSize.height * 1.3),
        child: Column(
          children: [
            CreatePostTopBarView(type: model.pageType, model: model),
            Expanded(
              child: SingleChildScrollView(
                keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                child: model.pageType == 0 ? CreatePostPage(model: model) : PostPage(model: model),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
