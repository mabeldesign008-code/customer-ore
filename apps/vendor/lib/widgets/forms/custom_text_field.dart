import 'package:flutter/material.dart';
import 'package:flutter_form_builder/flutter_form_builder.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';

class CustomTextField extends StatelessWidget {
  final String name;
  final String? label;
  final String? hintText;
  final String? prefixText;
  final int maxLines;
  final int? maxLength;
  final TextInputType keyboardType;
  final String? Function(String?)? validator;

  const CustomTextField({
    super.key,
    required this.name,
    this.label,
    this.hintText,
    this.prefixText,
    this.maxLines = 1,
    this.maxLength,
    this.keyboardType = TextInputType.text,
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
        FormBuilderTextField(
          name: name,
          maxLines: maxLines,
          maxLength: maxLength,
          keyboardType: keyboardType,
          validator: validator,
          style: AppTextStyles.inputText,
          decoration: InputDecoration(
            hintText: hintText,
            hintStyle: AppTextStyles.inputHint,
            filled: true,
            fillColor: AppColors.surface,
            contentPadding: EdgeInsets.symmetric(
              horizontal: 13,
              vertical: maxLines > 1 ? 14 : 0,
            ),
            prefixIcon: prefixText != null
                ? Container(
                    decoration: const BoxDecoration(
                      color: AppColors.surfaceSecondary,
                      borderRadius: BorderRadius.horizontal(
                        left: Radius.circular(16),
                      ),
                      border: Border(
                        right: BorderSide(
                          color: AppColors.inputBorder,
                        ),
                      ),
                    ),
                    margin: const EdgeInsets.only(right: 12),
                    padding: const EdgeInsets.symmetric(horizontal: 13),
                    alignment: Alignment.center,
                    width: 70,
                    child: Text(
                      prefixText!,
                      style: AppTextStyles.subtitleMedium.copyWith(
                        color: AppColors.textSecondary,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  )
                : null,
            prefixIconConstraints: prefixText != null
                ? const BoxConstraints(minHeight: 48, minWidth: 70)
                : null,
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
            counterText: '', // We hide default counter to match React UI
            constraints: maxLines == 1 ? const BoxConstraints(maxHeight: 48) : null,
          ),
        ),
        if (maxLength != null) ...[
          const SizedBox(height: 4),
          Align(
            alignment: Alignment.centerRight,
            child: Builder(
              builder: (context) {
                return Text(
                  '0 / $maxLength characters',
                  style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary),
                );
              },
            ),
          ),
        ],
      ],
    );
  }
}
