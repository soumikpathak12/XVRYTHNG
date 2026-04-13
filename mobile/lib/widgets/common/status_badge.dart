import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';

class StatusBadge extends StatelessWidget {
  final String label;
  final Color? color;
  final Color? textColor;
  final double fontSize;

  const StatusBadge({
    super.key,
    required this.label,
    this.color,
    this.textColor,
    this.fontSize = 11,
  });

  factory StatusBadge.fromStatus(String status) {
    return StatusBadge(
      label: _formatLabel(status),
      color: _getColor(status),
      textColor: _getTextColor(status),
    );
  }

  static String _formatLabel(String s) =>
      s.replaceAll('_', ' ').split(' ').map((w) =>
          w.isEmpty ? '' : '${w[0].toUpperCase()}${w.substring(1)}').join(' ');

  static Color _getColor(String status) {
    switch (status.toLowerCase()) {
      case 'active':
      case 'completed':
      case 'approved':
      case 'closed_won':
      case 'converted':
      case 'bonus_paid':
      case 'resolved':
        return AppColors.success.withOpacity(0.12);
      case 'pending':
      case 'new':
      case 'open':
      case 'scheduled':
        return AppColors.warning.withOpacity(0.12);
      case 'in_progress':
      case 'contacted':
      case 'qualified':
      case 'proposal':
      case 'proposal_sent':
      case 'inspection_booked':
      case 'inspection_completed':
      case 'installation_in_progress':
      case 'ces_certificate_applied':
      case 'grid_connection_initiated':
        return AppColors.info.withOpacity(0.12);
      case 'installation_completed':
      case 'ces_certificate_received':
      case 'grid_connection_completed':
      case 'system_handover':
        return AppColors.success.withOpacity(0.12);
      case 'to_be_rescheduled':
        return AppColors.warning.withOpacity(0.12);
      case 'rejected':
      case 'closed_lost':
      case 'lost':
      case 'cancelled':
      case 'inactive':
      case 'withdrawn':
        return AppColors.danger.withOpacity(0.12);
      case 'negotiation':
      case 'paused':
        return AppColors.primary.withOpacity(0.12);
      default:
        return AppColors.surface;
    }
  }

  static Color _getTextColor(String status) {
    switch (status.toLowerCase()) {
      case 'active':
      case 'completed':
      case 'approved':
      case 'closed_won':
      case 'converted':
      case 'bonus_paid':
      case 'resolved':
        return AppColors.success;
      case 'pending':
      case 'new':
      case 'open':
      case 'scheduled':
        return const Color(0xFFB8860B);
      case 'in_progress':
      case 'contacted':
      case 'qualified':
      case 'proposal':
      case 'proposal_sent':
      case 'inspection_booked':
      case 'inspection_completed':
      case 'installation_in_progress':
      case 'ces_certificate_applied':
      case 'grid_connection_initiated':
        return AppColors.info;
      case 'installation_completed':
      case 'ces_certificate_received':
      case 'grid_connection_completed':
      case 'system_handover':
        return AppColors.success;
      case 'to_be_rescheduled':
        return const Color(0xFFB8860B);
      case 'rejected':
      case 'closed_lost':
      case 'lost':
      case 'cancelled':
      case 'inactive':
      case 'withdrawn':
        return AppColors.danger;
      case 'negotiation':
      case 'paused':
        return AppColors.primary;
      default:
        return AppColors.textSecondary;
    }
  }

  @override
  Widget build(BuildContext context) {
    final bg = color ?? AppColors.surface;
    final fg = textColor ?? AppColors.textSecondary;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: fontSize,
          fontWeight: FontWeight.w600,
          color: fg,
        ),
      ),
    );
  }
}
