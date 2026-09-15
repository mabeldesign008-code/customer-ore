import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Premium Typography tokens for the Ore type system.
class AppTypography {
  AppTypography._();

  static TextStyle display([Color c = const Color(0xFF0F172A)]) => GoogleFonts.plusJakartaSans(
        fontSize: 32,
        fontWeight: FontWeight.w800,
        color: c,
        height: 1.2,
        letterSpacing: -1.0,
      );

  static TextStyle h1([Color c = const Color(0xFF0F172A)]) => GoogleFonts.plusJakartaSans(
        fontSize: 26,
        fontWeight: FontWeight.w800,
        color: c,
        height: 1.2,
        letterSpacing: -0.8,
      );

  static TextStyle h2([Color c = const Color(0xFF0F172A)]) => GoogleFonts.plusJakartaSans(
        fontSize: 20,
        fontWeight: FontWeight.w700,
        color: c,
        height: 1.3,
        letterSpacing: -0.5,
      );

  static TextStyle h3([Color c = const Color(0xFF0F172A)]) => GoogleFonts.plusJakartaSans(
        fontSize: 17,
        fontWeight: FontWeight.w700,
        color: c,
        height: 1.35,
        letterSpacing: -0.3,
      );

  static TextStyle bodyLg([Color c = const Color(0xFF0F172A)]) => GoogleFonts.plusJakartaSans(
        fontSize: 16,
        fontWeight: FontWeight.w600,
        color: c,
        height: 1.4,
      );

  static TextStyle body([Color c = const Color(0xFF0F172A)]) => GoogleFonts.plusJakartaSans(
        fontSize: 14,
        fontWeight: FontWeight.w500,
        color: c,
        height: 1.45,
      );

  static TextStyle bodySm([Color c = const Color(0xFF64748B)]) => GoogleFonts.plusJakartaSans(
        fontSize: 13,
        fontWeight: FontWeight.w500,
        color: c,
        height: 1.4,
      );

  static TextStyle caption([Color c = const Color(0xFF94A3B8)]) => GoogleFonts.plusJakartaSans(
        fontSize: 11,
        fontWeight: FontWeight.w700,
        color: c,
        letterSpacing: 0.5,
        height: 1.3,
      );

  static TextStyle button([Color c = Colors.white]) => GoogleFonts.plusJakartaSans(
        fontSize: 16,
        fontWeight: FontWeight.w700,
        color: c,
        letterSpacing: 0.2,
      );

  static TextStyle label([Color c = const Color(0xFF0F172A)]) => GoogleFonts.plusJakartaSans(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: c,
        height: 1.4,
      );

  static TextStyle bodySmall([Color c = const Color(0xFF64748B)]) => bodySm(c);
  
  static String get fontFamily => GoogleFonts.plusJakartaSans().fontFamily ?? 'sans-serif';
}
