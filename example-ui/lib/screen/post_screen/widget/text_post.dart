import 'package:flutter/material.dart';
import 'package:orange_ui/common/detectable_text_custom.dart';

class TextPost extends StatelessWidget {
  final String? description;

  const TextPost({super.key, required this.description});

  @override
  Widget build(BuildContext context) {
    return Visibility(
      visible: description != null,
      child: Padding(
        padding: const EdgeInsets.only(left: 15.0, right: 15, bottom: 10),
        child: DetectableTextCustom(
          text: description ?? '',
        ),
      ),
    );
  }
}
