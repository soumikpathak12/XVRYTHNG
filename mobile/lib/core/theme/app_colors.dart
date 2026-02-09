import 'package:flutter/material.dart';

/// xTechs Renewables Brand Colors
/// Color palette following the company brand identity guidelines
class AppColors {
  AppColors._();

  // ============ PRIMARY COLORS ============

  /// Primary Teal - #1A7B7B
  /// Used for: Primary buttons, headers, active states, sidebar navigation
  static const Color primary = Color(0xFF1A7B7B);

  /// Secondary Teal - #4DB8A8
  /// Used for: Hover states, secondary actions, accent elements
  static const Color secondary = Color(0xFF4DB8A8);

  // ============ BACKGROUND & SURFACE COLORS ============

  /// Background White - #FFFFFF
  /// Used for: Main content area backgrounds
  static const Color background = Color(0xFFFFFFFF);

  /// Surface Light Gray - #F5F5F5
  /// Used for: Card backgrounds, table alternating rows
  static const Color surface = Color(0xFFF5F5F5);

  // ============ TEXT COLORS ============

  /// Text Primary Dark - #1A1A2E
  /// Used for: Headings and primary text
  static const Color textPrimary = Color(0xFF1A1A2E);

  /// Text Secondary Gray - #555555
  /// Used for: Body text, descriptions, secondary labels
  static const Color textSecondary = Color(0xFF555555);

  // ============ SEMANTIC COLORS ============

  /// Success Green - #28A745
  /// Used for: Completed statuses, approvals, Closed Won
  static const Color success = Color(0xFF28A745);

  /// Warning Yellow - #FFC107
  /// Used for: Pending items, attention required
  static const Color warning = Color(0xFFFFC107);

  /// Danger Red - #DC3545
  /// Used for: Urgent items, rejections, Closed Lost
  static const Color danger = Color(0xFFDC3545);

  /// Info Blue - #17A2B8
  /// Used for: In-progress statuses, informational badges
  static const Color info = Color(0xFF17A2B8);

  // ============ EXTENDED PALETTE ============

  /// Primary color shades for Material color swatch
  static const MaterialColor primarySwatch = MaterialColor(
    0xFF1A7B7B,
    <int, Color>{
      50: Color(0xFFE3F0F0),
      100: Color(0xFFB8DADA),
      200: Color(0xFF8DC4C4),
      300: Color(0xFF61ADAD),
      400: Color(0xFF3E9494),
      500: Color(0xFF1A7B7B),
      600: Color(0xFF177070),
      700: Color(0xFF136363),
      800: Color(0xFF0F5656),
      900: Color(0xFF083C3C),
    },
  );

  /// Additional utility colors
  static const Color white = Color(0xFFFFFFFF);
  static const Color black = Color(0xFF000000);
  static const Color transparent = Colors.transparent;

  /// Divider and border colors
  static const Color divider = Color(0xFFE0E0E0);
  static const Color border = Color(0xFFDDDDDD);

  /// Disabled state colors
  static const Color disabled = Color(0xFFBDBDBD);
  static const Color disabledBackground = Color(0xFFE8E8E8);

  /// Overlay colors
  static const Color overlay = Color(0x80000000);
  static const Color overlayLight = Color(0x40000000);

  // ============ DARK THEME COLORS ============

  /// Dark theme background
  static const Color darkBackground = Color(0xFF121212);

  /// Dark theme surface
  static const Color darkSurface = Color(0xFF1E1E1E);

  /// Dark theme card
  static const Color darkCard = Color(0xFF2D2D2D);

  /// Dark text on dark background
  static const Color darkTextPrimary = Color(0xFFE0E0E0);
  static const Color darkTextSecondary = Color(0xFFB0B0B0);
}
