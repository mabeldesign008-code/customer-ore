import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';
import '../motion/motion.dart';

/// Animated skeleton that fades to content when [isLoading] becomes false.
class ShimmerSwitcher extends StatelessWidget {
  const ShimmerSwitcher({
    super.key,
    required this.isLoading,
    required this.skeleton,
    required this.child,
  });

  final bool isLoading;
  final Widget skeleton;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return AnimatedCrossFade(
      duration: Motion.normal,
      crossFadeState:
          isLoading ? CrossFadeState.showFirst : CrossFadeState.showSecond,
      firstChild: skeleton,
      secondChild: child,
      layoutBuilder: (topChild, topKey, bottomChild, bottomKey) => Stack(
        alignment: Alignment.topCenter,
        children: [
          Positioned(key: bottomKey, top: 0, child: bottomChild),
          Positioned(key: topKey, top: 0, child: topChild),
        ],
      ),
    );
  }
}

class VendorCardSkeleton extends StatelessWidget {
  const VendorCardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: Colors.grey.shade200,
      highlightColor: Colors.grey.shade100,
      child: Container(
        margin: const EdgeInsets.only(bottom: 20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(height: 176, width: double.infinity, color: Colors.white),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(height: 14, width: 180, color: Colors.white),
                  const SizedBox(height: 8),
                  Container(height: 10, width: 100, color: Colors.white),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Container(height: 16, width: 60, color: Colors.white),
                      const Spacer(),
                      Container(
                          height: 20,
                          width: 60,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(8),
                          )),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class HorizontalVendorSkeleton extends StatelessWidget {
  const HorizontalVendorSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 240,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        itemBuilder: (_, __) => Shimmer.fromColors(
          baseColor: Colors.grey.shade200,
          highlightColor: Colors.grey.shade100,
          child: Container(
            width: 182,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  height: 176,
                  width: 182,
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    borderRadius:
                        BorderRadius.vertical(top: Radius.circular(16)),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(height: 12, width: 120, color: Colors.white),
                      const SizedBox(height: 8),
                      Container(height: 10, width: 80, color: Colors.white),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        separatorBuilder: (_, __) => const SizedBox(width: 16),
        itemCount: 3,
      ),
    );
  }
}

class OrderCardSkeleton extends StatelessWidget {
  const OrderCardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: Colors.grey.shade200,
      highlightColor: Colors.grey.shade100,
      child: Container(
        margin: const EdgeInsets.only(bottom: 14),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              Container(
                  width: 44,
                  height: 44,
                  decoration: const BoxDecoration(
                      color: Colors.white, shape: BoxShape.circle)),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(height: 12, width: 120, color: Colors.white),
                      const SizedBox(height: 6),
                      Container(height: 10, width: 80, color: Colors.white),
                    ]),
              ),
              Container(
                  height: 24,
                  width: 64,
                  decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(8))),
            ]),
            const SizedBox(height: 12),
            Container(height: 10, width: double.infinity, color: Colors.white),
            const SizedBox(height: 8),
            Container(height: 10, width: 200, color: Colors.white),
          ],
        ),
      ),
    );
  }
}
