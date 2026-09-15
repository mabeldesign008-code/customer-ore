import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/screen/feed_screen/feed_screen_view_model.dart';
import 'package:orange_ui/screen/hashtag_screen/hashtag_screen_view_model.dart';
import 'package:orange_ui/screen/post_screen/widget/post_card.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';
import 'package:stacked/stacked.dart';

class HashtagScreen extends StatelessWidget {
  final String hashtagName;

  const HashtagScreen({super.key, required this.hashtagName});

  @override
  Widget build(BuildContext context) {
    return ViewModelBuilder<HashtagScreenViewModel>.reactive(
      onViewModelReady: (viewModel) => viewModel.init(),
      viewModelBuilder: () => HashtagScreenViewModel(hashtagName),
      builder: (context, viewModel, child) => Scaffold(
        backgroundColor: ColorRes.white,
        body: Column(
          children: [
            SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.all(10.0),
                child: Stack(
                  children: [
                    InkWell(
                      onTap: Get.back,
                      child: const Icon(Icons.arrow_back_rounded,
                          color: ColorRes.davyGrey),
                    ),
                    Align(
                      alignment: Alignment.center,
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 40.0),
                        child: Text(
                          hashtagName,
                          style: const TextStyle(
                              fontFamily: FontRes.bold,
                              fontSize: 18,
                              color: ColorRes.themeColor),
                          overflow: TextOverflow.ellipsis,
                          maxLines: 1,
                        ),
                      ),
                    )
                  ],
                ),
              ),
            ),
            Expanded(
              child: ViewModelBuilder<FeedScreenViewModel>.nonReactive(
                viewModelBuilder: () => FeedScreenViewModel(),
                builder: (context, model, child) {
                  return ListView.builder(
                    controller: viewModel.scrollController,
                    itemCount: viewModel.posts.length,
                    padding: const EdgeInsets.only(top: 10),
                    itemBuilder: (context, index) => PostCard(
                      model: model,
                      post: viewModel.posts[index],
                      postIndex: index,
                      updatePost: viewModel.updateAllPost,
                      onDeleteItem: viewModel.onDeleteItem,
                    ),
                  );
                },
              ),
            )
          ],
        ),
      ),
    );
  }
}
