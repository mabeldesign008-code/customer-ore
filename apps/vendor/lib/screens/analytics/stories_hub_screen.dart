import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:video_player/video_player.dart';

import '../../data/catalog/vendor_catalog_repository.dart';
import '../../providers/vendor_data_provider.dart';
import 'create_story_screen.dart';

class StoriesHubScreen extends ConsumerWidget {
  const StoriesHubScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Stories'),
        actions: [IconButton(tooltip: 'Action', onPressed: () => _create(context), icon: const Icon(LucideIcons.plus))],
      ),
      body: FutureBuilder<List<VendorStoryRecord>>(
        future: ref.read(vendorCatalogRepositoryProvider).getActiveStories(),
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) return const Center(child: CircularProgressIndicator(semanticsLabel: 'Loading'));
          if (snapshot.hasError) return const Center(child: Text('Unable to load active stories'));
          final stories = snapshot.data ?? const <VendorStoryRecord>[];
          if (stories.isEmpty) return Center(child: ElevatedButton.icon(onPressed: () => _create(context), icon: const Icon(LucideIcons.plus), label: const Text('Create first story')));
          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: stories.length,
            itemBuilder: (_, index) {
              final story = stories[index];
              return Card(
                clipBehavior: Clip.antiAlias,
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  AspectRatio(aspectRatio: 1.7, child: story.kind == 'VIDEO' ? _VideoStory(url: story.mediaUrl) : CachedNetworkImage(imageUrl: story.mediaUrl, fit: BoxFit.cover)),
                  Padding(padding: const EdgeInsets.all(12), child: Text(story.caption?.isNotEmpty == true ? story.caption! : 'Image story', style: const TextStyle(fontWeight: FontWeight.w600))),
                ]),
              );
            },
          );
        },
      ),
    );
  }

  void _create(BuildContext context) => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const CreateStoryScreen()));
}

class _VideoStory extends StatefulWidget {
  const _VideoStory({required this.url});
  final String url;

  @override
  State<_VideoStory> createState() => _VideoStoryState();
}

class _VideoStoryState extends State<_VideoStory> {
  late final VideoPlayerController _controller;

  @override
  void initState() {
    super.initState();
    _controller = VideoPlayerController.networkUrl(Uri.parse(widget.url))..initialize().then((_) { if (mounted) setState(() {}); });
  }

  @override
  void dispose() { _controller.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    if (!_controller.value.isInitialized) return const ColoredBox(color: Colors.black12, child: Center(child: CircularProgressIndicator(semanticsLabel: 'Loading')));
    return Stack(alignment: Alignment.center, children: [VideoPlayer(_controller), IconButton(tooltip: 'Action', onPressed: () { setState(() { _controller.value.isPlaying ? _controller.pause() : _controller.play(); }); }, icon: Icon(_controller.value.isPlaying ? LucideIcons.pause : LucideIcons.play, color: Colors.white, size: 36))]);
  }
}
