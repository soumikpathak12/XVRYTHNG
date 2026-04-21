import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';

Future<int?> showAttendanceLunchBreakSheet(
  BuildContext context, {
  required String actionLabel,
}) {
  return showModalBottomSheet<int>(
    context: context,
    isScrollControlled: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (sheetContext) {
      int selectedMinutes = 0;

      return StatefulBuilder(
        builder: (context, setState) {
          return SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: Colors.grey[300],
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Lunch break',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Choose whether to deduct a 30-minute lunch break when you $actionLabel. '
                    'Worked hours update automatically with your choice.',
                    style: TextStyle(
                      fontSize: 13,
                      color: Colors.grey[700],
                      height: 1.35,
                    ),
                  ),
                  const SizedBox(height: 12),
                  RadioListTile<int>(
                    contentPadding: EdgeInsets.zero,
                    value: 0,
                    groupValue: selectedMinutes,
                    activeColor: AppColors.primary,
                    title: const Text('No lunch deduction'),
                    subtitle: const Text('Use the full shift time.'),
                    onChanged: (value) => setState(() => selectedMinutes = value ?? 0),
                  ),
                  RadioListTile<int>(
                    contentPadding: EdgeInsets.zero,
                    value: 30,
                    groupValue: selectedMinutes,
                    activeColor: AppColors.primary,
                    title: const Text('Deduct 30 minutes'),
                    subtitle: const Text('Apply a standard lunch break deduction.'),
                    onChanged: (value) => setState(() => selectedMinutes = value ?? 30),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => Navigator.pop(sheetContext),
                          child: const Text('Cancel'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: FilledButton(
                          onPressed: () => Navigator.pop(sheetContext, selectedMinutes),
                          child: const Text('Continue'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      );
    },
  );
}
