import 'package:ore_core/ore_core.dart';

class VendorStoryPost {
  final String id;
  final String mediaUrl;
  final MediaType mediaType;
  final String? caption;
  final String? productName;
  final String? productId;
  final String? vendorId;
  final double? price;
  final DateTime createdAt;
  final Duration duration;

  VendorStoryPost({
    required this.id,
    required this.mediaUrl,
    this.mediaType = MediaType.image,
    this.caption,
    this.productName,
    this.productId,
    this.vendorId,
    this.price,
    required this.createdAt,
    this.duration = const Duration(seconds: 5),
  });
}

enum MediaType { image, video }

class VendorStory {
  final String vendorId;
  final String vendorName;
  final String vendorImage;
  final ServiceType? serviceType;
  final List<VendorStoryPost> posts;
  final bool isViewed;

  VendorStory({
    required this.vendorId,
    required this.vendorName,
    required this.vendorImage,
    this.serviceType,
    required this.posts,
    this.isViewed = false,
  });

  bool get hasActivePosts => posts.any((p) => DateTime.now().difference(p.createdAt).inHours < 24);
  List<VendorStoryPost> get activePosts => posts.where((p) => DateTime.now().difference(p.createdAt).inHours < 24).toList();

  VendorStory copyWith({String? vendorId, String? vendorName, String? vendorImage, ServiceType? serviceType, List<VendorStoryPost>? posts, bool? isViewed}) {
    return VendorStory(
      vendorId: vendorId ?? this.vendorId,
      vendorName: vendorName ?? this.vendorName,
      vendorImage: vendorImage ?? this.vendorImage,
      serviceType: serviceType ?? this.serviceType,
      posts: posts ?? this.posts,
      isViewed: isViewed ?? this.isViewed,
    );
  }
}
