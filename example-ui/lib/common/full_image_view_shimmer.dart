import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/screen/shimmer_screen/shimmer_screen.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:shimmer/shimmer.dart';

class FullImageViewShimmer extends StatelessWidget {
  const FullImageViewShimmer({
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 17),
        child: AspectRatio(
          aspectRatio: 1 / 1.30,
          child: Stack(
            children: [
              ShimmerScreen.rectangular(
                width: Get.width,
                height: Get.height,
                shapeBorder: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(21),
                ),
              ),
              Align(
                alignment: Alignment.topCenter,
                child: Padding(
                  padding: const EdgeInsets.only(top: 10, left: 15, right: 15),
                  child: Shimmer(
                    gradient: const LinearGradient(
                      colors: [
                        Colors.white24,
                        Colors.white38,
                        Colors.white54,
                      ],
                      stops: [
                        0.3,
                        0.6,
                        0.9,
                      ],
                      begin: Alignment(-1.0, -0.3),
                      end: Alignment(1.0, 0.3),
                      tileMode: TileMode.mirror,
                    ),
                    direction: ShimmerDirection.ltr,
                    child: Container(
                      width: double.infinity,
                      height: 5,
                      decoration: ShapeDecoration(
                          color: ColorRes.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4))),
                    ),
                  ),
                ),
              ),
              Align(
                alignment: Alignment.bottomCenter,
                child: Container(
                  height: 90,
                  margin: const EdgeInsets.all(15),
                  padding: const EdgeInsets.all(5),
                  width: double.infinity,
                  decoration: BoxDecoration(
                      color: ColorRes.white.withValues(alpha: 0.5),
                      borderRadius: BorderRadius.circular(10)),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Padding(
                        padding: const EdgeInsets.only(left: 5, top: 5),
                        child: ShimmerScreen.rectangular(
                          height: 20,
                          width: 200,
                          shapeBorder: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.only(left: 5, top: 5, bottom: 5),
                        child: ShimmerScreen.rectangular(
                          height: 15,
                          width: 175,
                          shapeBorder: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                        ),
                      ),
                      const Padding(
                        padding: EdgeInsets.symmetric(
                          horizontal: 5,
                        ),
                        child: ShimmerScreen.rectangular(
                          height: 10,
                          width: double.infinity,
                          shapeBorder: RoundedRectangleBorder(
                            borderRadius: BorderRadius.only(
                              topLeft: Radius.circular(5),
                              topRight: Radius.circular(5),
                              bottomRight: Radius.circular(5),
                            ),
                          ),
                        ),
                      ),
                      const Padding(
                        padding: EdgeInsets.only(
                          left: 5,
                        ),
                        child: ShimmerScreen.rectangular(
                          height: 10,
                          width: 200,
                          shapeBorder: RoundedRectangleBorder(
                            borderRadius: BorderRadius.all(
                              Radius.circular(0),
                            ),
                          ),
                        ),
                      ),
                      const Padding(
                        padding: EdgeInsets.only(
                          left: 5,
                        ),
                        child: ShimmerScreen.rectangular(
                          height: 10,
                          width: 250,
                          shapeBorder: RoundedRectangleBorder(
                            borderRadius: BorderRadius.only(
                              bottomLeft: Radius.circular(5),
                              topRight: Radius.circular(5),
                              bottomRight: Radius.circular(5),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              )
            ],
          ),
        ),
      ),
    );
  }
}
