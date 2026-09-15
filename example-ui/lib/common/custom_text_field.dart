import 'package:figma_squircle/figma_squircle.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';

class CustomTextField extends StatefulWidget {
  final String? title;
  final String? exampleTitle;
  final String? suffixIcon;
  final String? prefixIcon;
  final double? height;
  final Widget? child;
  final TextEditingController? controller;
  final bool isExpand;
  final String? hintText;
  final Function(String value)? onChanged;
  final TextCapitalization textCapitalization;

  const CustomTextField({
    super.key,
    this.title,
    this.suffixIcon,
    this.prefixIcon,
    this.height,
    this.exampleTitle,
    this.child,
    this.controller,
    this.isExpand = false,
    this.hintText,
    this.onChanged,
    this.textCapitalization = TextCapitalization.none,
  });

  @override
  State<CustomTextField> createState() => _CustomTextFieldState();
}

class _CustomTextFieldState extends State<CustomTextField> {
  bool isPasswordShow = false;

  @override
  void initState() {
    if (widget.suffixIcon != null) {
      isPasswordShow = true;
      setState(() {});
    }
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      spacing: 10,
      children: [
        if (widget.title != null)
          TitleTextView(title: widget.title?.capitalize ?? '', exampleTitle: widget.exampleTitle),
        Container(
          height: widget.height ?? 50,
          decoration: ShapeDecoration(
              shape: SmoothRectangleBorder(
                  borderRadius: SmoothBorderRadius(cornerRadius: 15, cornerSmoothing: 1),
                  side: const BorderSide(color: ColorRes.borderColor))),
          child: widget.child ??
              TextField(
                controller: widget.controller,
                expands: widget.isExpand,
                maxLines: widget.isExpand ? null : 1,
                minLines: null,
                onChanged: widget.onChanged,
                textCapitalization: widget.textCapitalization,
                obscureText: isPasswordShow,
                decoration: InputDecoration(
                  border: InputBorder.none,
                  hintText: widget.hintText,
                  hintStyle: const TextStyle(
                      color: ColorRes.dimGrey3, fontFamily: FontRes.regular, fontSize: 16),
                  prefixIcon: widget.prefixIcon == null
                      ? null
                      : Padding(
                          padding: const EdgeInsets.all(10.0),
                          child: Image.asset(widget.prefixIcon ?? '',
                              height: 20, width: 20, color: ColorRes.dimGrey3),
                        ),
                  prefixIconConstraints: const BoxConstraints(),
                  suffixIconConstraints: const BoxConstraints(),
                  suffixIcon: widget.suffixIcon == null
                      ? null
                      : InkWell(
                          onTap: () {
                            isPasswordShow = !isPasswordShow;
                            setState(() {});
                          },
                          child: Padding(
                            padding: const EdgeInsets.all(10),
                            child: Image.asset(widget.suffixIcon ?? '',
                                height: 20, width: 20, color: ColorRes.dimGrey3),
                          ),
                        ),
                  contentPadding: const EdgeInsets.all(15),
                ),
                textAlignVertical:
                    widget.isExpand ? TextAlignVertical.top : TextAlignVertical.center,
                onTapOutside: (event) => FocusManager.instance.primaryFocus?.unfocus(),
                style: const TextStyle(
                    color: ColorRes.dimGrey3, fontFamily: FontRes.medium, fontSize: 16),
              ),
        )
      ],
    );
  }
}

class TitleTextView extends StatelessWidget {
  final String title;
  final String? exampleTitle;

  const TitleTextView({super.key, required this.title, this.exampleTitle});

  @override
  Widget build(BuildContext context) {
    return RichText(
      text: TextSpan(
        text: title,
        style: const TextStyle(fontFamily: FontRes.medium, fontSize: 16, color: ColorRes.darkGrey),
        children: [
          if (exampleTitle != null)
            TextSpan(
              text: exampleTitle ?? '',
              style: const TextStyle(
                  fontFamily: FontRes.medium, fontSize: 16, color: ColorRes.dimGrey3),
            )
        ],
      ),
    );
  }
}
