import 'package:flutter/material.dart';
import 'package:flutter_form_builder/flutter_form_builder.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';

class CustomDropdownField<T> extends StatelessWidget {
  final String name;
  final String? label;
  final String? hintText;
  final List<DropdownMenuItem<T>> items;
  final String? Function(T?)? validator;

  const CustomDropdownField({
    super.key,
    required this.name,
    this.label,
    this.hintText,
    required this.items,
    this.validator,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (label != null) ...[
          Text(
            label!,
            style: AppTextStyles.label.copyWith(
              color: const Color(0xFF334155),
            ),
          ),
          const SizedBox(height: 4),
        ],
        FormBuilderDropdown<T>(
          name: name,
          items: items,
          validator: validator,
          style: AppTextStyles.inputText,
          icon: const Icon(LucideIcons.chevronDown, color: AppColors.textSecondary, size: 20),
          decoration: InputDecoration(
            hintText: hintText,
            hintStyle: AppTextStyles.inputHint,
            filled: true,
            fillColor: AppColors.surface,
            contentPadding: const EdgeInsets.symmetric(horizontal: 13, vertical: 0),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: const BorderSide(color: AppColors.inputBorder),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: const BorderSide(color: AppColors.inputBorder),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: const BorderSide(color: AppColors.inputFocusBorder),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: const BorderSide(color: AppColors.error),
            ),
            constraints: const BoxConstraints(maxHeight: 48),
          ),
        ),
      ],
    );
  }
}
