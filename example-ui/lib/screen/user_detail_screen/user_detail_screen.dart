import 'package:flutter/material.dart';
import 'package:orange_ui/common/custom_image.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/screen/user_detail_screen/user_detail_screen_view_model.dart';
import 'package:orange_ui/screen/user_detail_screen/widgets/detail_page.dart';
import 'package:orange_ui/screen/user_detail_screen/widgets/image_selection_area.dart';
import 'package:orange_ui/screen/user_detail_screen/widgets/top_bar.dart';
import 'package:orange_ui/service/extention/string_extention.dart';
import 'package:stacked/stacked.dart';

class UserDetailScreen extends StatefulWidget {
  final bool? showInfo;
  final UserData? userData;
  final int? userId;
  final Function(UserData? userData)? onUpdateUser;

  const UserDetailScreen(
      {super.key,
      this.showInfo,
      this.userData,
      this.userId,
      this.onUpdateUser});

  @override
  State<UserDetailScreen> createState() => _UserDetailScreenState();
}

class _UserDetailScreenState extends State<UserDetailScreen>
    with TickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<Offset> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
        duration: const Duration(milliseconds: 300), vsync: this);
    _animation =
        Tween<Offset>(begin: const Offset(0, 1.0), end: const Offset(0.0, 0.0))
            .animate(CurvedAnimation(
                parent: _controller,
                curve: Curves.linear,
                reverseCurve: Curves.linear));
  }

  @override
  Widget build(BuildContext context) {
    return ViewModelBuilder<UserDetailScreenViewModel>.reactive(
      onViewModelReady: (model) {
        model.init(model.moreInfo);
      },
      viewModelBuilder: () => UserDetailScreenViewModel(
          otherUserData: widget.userData,
          userId: widget.userId,
          onUpdateUser: widget.onUpdateUser),
      builder: (context, model, child) {
        List<Images> images = model.otherUserData?.images ?? [];
        return Scaffold(
          resizeToAvoidBottomInset: false,
          body: Stack(
            children: [
              if (images.isNotEmpty)
                CustomImage(
                  image: images[model.selectedImgIndex].image?.addBaseURL(),
                  height: double.infinity,
                  width: double.infinity,
                ),
              Column(
                children: [
                  TopBar(model: model),
                  Expanded(
                    child: !model.moreInfo
                        ? ImageSelectionArea(
                            model: model,
                            onMoreInfoTap: () {
                              model.moreInfo = true;
                              _controller.forward();
                              setState(() {});
                            },
                          )
                        : SlideTransition(
                            position: _animation,
                            transformHitTests: true,
                            child: DetailPage(
                              model: model,
                              onHideBtnTap: () {
                                _controller.reverse().then((value) {
                                  model.moreInfo = false;
                                  setState(() {});
                                });
                              },
                            ),
                          ),
                  )
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }
}
