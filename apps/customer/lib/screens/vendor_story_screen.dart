import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:ore_core/ore_core.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../core/ui/customer_image.dart';

import '../models/vendor_story.dart';

/// Instagram-style stories viewer — tap left/right to advance, long-press to
/// pause, tap vendor avatar to visit vendor store.
class VendorStoryScreen extends StatefulWidget {
  final List<VendorStory> allVendorStories;
  final int initialVendorIndex;
  final int initialPostIndex;

  const VendorStoryScreen({
    super.key,
    required this.allVendorStories,
    required this.initialVendorIndex,
    this.initialPostIndex = 0,
  });

  @override
  State<VendorStoryScreen> createState() => _VendorStoryScreenState();
}

class _VendorStoryScreenState extends State<VendorStoryScreen> with SingleTickerProviderStateMixin {
  late PageController _page;
  late AnimationController _progress;
  int _vendorIdx = 0;
  int _postIdx = 0;
  bool _paused = false;

  @override
  void initState() {
    super.initState();
    _vendorIdx = widget.initialVendorIndex;
    _postIdx = widget.initialPostIndex;
    _page = PageController(initialPage: _postIdx);
    _progress = AnimationController(vsync: this, duration: const Duration(seconds: 5));
    _start();
  }

  @override
  void dispose() { _page.dispose(); _progress.dispose(); super.dispose(); }

  VendorStory get vendor => widget.allVendorStories[_vendorIdx];
  List<VendorStoryPost> get posts => vendor.activePosts;

  void _start() {
    if (_paused) return;
    _progress.forward().then((_) {
      if (!_paused && mounted) _next();
    });
  }

  void _pause() { setState(() => _paused = true); _progress.stop(); }
  void _resume() { setState(() => _paused = false); _start(); }

  void _next() {
    if (_postIdx < posts.length - 1) {
      setState(() => _postIdx++);
      _page.nextPage(duration: Motion.normal, curve: Motion.standard);
      _progress.reset();
      _start();
    } else {
      _nextVendor();
    }
  }

  void _nextVendor() {
    if (_vendorIdx < widget.allVendorStories.length - 1) {
      setState(() { _vendorIdx++; _postIdx = 0; });
      _page = PageController();
      _progress.reset();
      _start();
    } else {
      context.pop();
    }
  }

  void _prev() {
    if (_postIdx > 0) {
      setState(() => _postIdx--);
      _page.previousPage(duration: Motion.normal, curve: Motion.standard);
      _progress.reset();
      _start();
    } else if (_vendorIdx > 0) {
      setState(() {
        _vendorIdx--;
        _postIdx = widget.allVendorStories[_vendorIdx].activePosts.length - 1;
      });
      _page = PageController(initialPage: _postIdx);
      _progress.reset();
      _start();
    }
  }

  @override
  Widget build(BuildContext context) {
    SystemChrome.setSystemUIOverlayStyle(SystemUiOverlayStyle.light);
    if (posts.isEmpty) {
      return Scaffold(backgroundColor: Colors.black, body: Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        const Icon(Icons.schedule_rounded, color: Colors.white54, size: 64),
        const SizedBox(height: 16),
        Text('No active stories', style: AppTypography.bodyLg(Colors.white)),
        const SizedBox(height: 8),
        Text('Stories expire after 24 hours', style: AppTypography.body(Colors.white54)),
      ])));
    }

    final post = posts[_postIdx];
    return Scaffold(
      backgroundColor: Colors.black,
      body: GestureDetector(
        onTapUp: (d) {
          final w = MediaQuery.of(context).size.width;
          if (d.globalPosition.dx < w * 0.3) _prev();
          else if (d.globalPosition.dx > w * 0.7) _next();
        },
        onLongPressStart: (_) => _pause(),
        onLongPressEnd: (_) => _resume(),
        child: Stack(fit: StackFit.expand, children: [
          // Media
          PageView.builder(
            controller: _page,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: posts.length,
            itemBuilder: (c, i) => CustomerImage(
              posts[i].mediaUrl, fit: BoxFit.cover,
              errorBuilder: (_,__,___) => Container(color: vendor.serviceType?.color ?? AppColors.primary, child: const Center(child: Icon(Icons.image_outlined, color: Colors.white54, size: 64))),
            ),
          ),
          // Gradients
          Positioned(top: 0, left: 0, right: 0, child: Container(height: 180, decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Colors.black.withOpacity(0.6), Colors.transparent])))),
          Positioned(bottom: 0, left: 0, right: 0, child: Container(height: 280, decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.bottomCenter, end: Alignment.topCenter, colors: [Colors.black.withOpacity(0.75), Colors.transparent])))),

          // Progress bars
          Positioned(
            top: MediaQuery.of(context).padding.top + 12, left: 12, right: 12,
            child: Row(children: List.generate(posts.length, (i) => Expanded(
              child: Container(
                height: 3,
                margin: EdgeInsets.only(right: i < posts.length - 1 ? 4 : 0),
                decoration: BoxDecoration(color: Colors.white.withOpacity(0.3), borderRadius: BorderRadius.circular(2)),
                child: AnimatedBuilder(
                  animation: _progress,
                  builder: (c, _) {
                    double p = 0;
                    if (i < _postIdx) p = 1;
                    else if (i == _postIdx) p = _progress.value;
                    return FractionallySizedBox(
                      alignment: Alignment.centerLeft, widthFactor: p,
                      child: Container(decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(2))),
                    );
                  },
                ),
              ),
            ))),
          ),

          // Header
          Positioned(
            top: MediaQuery.of(context).padding.top + 28, left: 16, right: 16,
            child: Row(children: [
              GestureDetector(
                onTap: () { Haptics.medium(); context.push('/vendor/${vendor.vendorId}'); },
                child: Container(
                  width: 40, height: 40,
                  padding: const EdgeInsets.all(2),
                  decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: AppColors.primary, width: 2), color: Colors.white),
                  child: ClipOval(
                    child: CustomerImage(vendor.vendorImage, fit: BoxFit.cover, errorBuilder: (_,__,___) => Container(color: AppColors.primary.withOpacity(0.2), child: const Icon(Icons.storefront_rounded, color: Colors.white, size: 18))),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: GestureDetector(
                  onTap: () { Haptics.medium(); context.push('/vendor/${vendor.vendorId}'); },
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(vendor.vendorName, style: AppTypography.body(Colors.white).copyWith(fontWeight: FontWeight.w700)),
                    Text(_ago(post.createdAt), style: AppTypography.caption(Colors.white70)),
                  ]),
                ),
              ),
              GestureDetector(
                onTap: () => context.pop(),
                child: Container(width: 38, height: 38, decoration: BoxDecoration(color: Colors.black26, shape: BoxShape.circle), child: const Icon(Icons.close_rounded, color: Colors.white, size: 18)),
              ),
            ]),
          ),

          // CTA
          if (post.productName != null)
            Positioned(
              left: 20, right: 20,
              bottom: MediaQuery.of(context).padding.bottom + 24,
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                if (post.caption != null) Text(post.caption!, style: AppTypography.body(Colors.white)),
                if (post.caption != null) const SizedBox(height: 12),
                AnimatedPress(
                  onTap: () {
                    Haptics.medium();
                    if (post.productId != null && post.vendorId != null) {
                      context.push('/product/${post.vendorId}/${post.productId}');
                    }
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: [BoxShadow(color: AppColors.primary.withOpacity(0.5), blurRadius: 18, offset: const Offset(0, 8))],
                    ),
                    child: Row(children: [
                      const Icon(Icons.shopping_cart_outlined, color: Colors.white, size: 20),
                      const SizedBox(width: 10),
                      Text('Order Now', style: AppTypography.body(Colors.white).copyWith(fontWeight: FontWeight.w700, fontSize: 16)),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(14)),
                        child: Text(Formatters.money(post.price ?? 45), style: AppTypography.body(Colors.white).copyWith(fontWeight: FontWeight.w800)),
                      ),
                    ]),
                  ),
                ).animate().fadeIn(delay: 300.ms).slideY(begin: 0.2, curve: Motion.spring),
              ]),
            ),
        ]),
      ),
    );
  }

  String _ago(DateTime t) {
    final d = DateTime.now().difference(t);
    if (d.inMinutes < 60) return '${d.inMinutes}m';
    if (d.inHours < 24) return '${d.inHours}h';
    return '${d.inDays}d';
  }
}
