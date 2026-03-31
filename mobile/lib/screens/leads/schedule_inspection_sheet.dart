import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/theme/app_colors.dart';
import '../../services/leads_service.dart';

/// Bottom sheet for scheduling a site inspection on a lead.
class ScheduleInspectionSheet extends StatefulWidget {
  final int leadId;
  final String? currentDate;

  const ScheduleInspectionSheet({
    super.key,
    required this.leadId,
    this.currentDate,
  });

  @override
  State<ScheduleInspectionSheet> createState() =>
      _ScheduleInspectionSheetState();
}

class _ScheduleInspectionSheetState extends State<ScheduleInspectionSheet> {
  final _service = LeadsService();
  final _notesCtrl = TextEditingController();
  DateTime? _selectedDate;
  TimeOfDay? _selectedTime;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    if (widget.currentDate != null) {
      _selectedDate = DateTime.tryParse(widget.currentDate!);
    }
  }

  @override
  void dispose() {
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _selectedDate ?? DateTime.now().add(const Duration(days: 1)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      builder: (c, child) => Theme(
        data: Theme.of(c).copyWith(
          colorScheme: ColorScheme.light(primary: AppColors.primary),
        ),
        child: child!,
      ),
    );
    if (date != null) setState(() => _selectedDate = date);
  }

  Future<void> _pickTime() async {
    final time = await showTimePicker(
      context: context,
      initialTime: _selectedTime ?? const TimeOfDay(hour: 9, minute: 0),
      builder: (c, child) => Theme(
        data: Theme.of(c).copyWith(
          colorScheme: ColorScheme.light(primary: AppColors.primary),
        ),
        child: child!,
      ),
    );
    if (time != null) setState(() => _selectedTime = time);
  }

  Future<void> _save() async {
    if (_selectedDate == null) {
      setState(() => _error = 'Please select a date');
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });

    try {
      final dt = _selectedDate!;
      final tm = _selectedTime ?? const TimeOfDay(hour: 9, minute: 0);
      final scheduled =
          DateTime(dt.year, dt.month, dt.day, tm.hour, tm.minute);

      await _service.scheduleInspection(widget.leadId, {
        'scheduled_date': scheduled.toIso8601String(),
        if (_notesCtrl.text.trim().isNotEmpty)
          'notes': _notesCtrl.text.trim(),
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Inspection scheduled'),
            backgroundColor: AppColors.success,
          ),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Handle
          Center(
            child: Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: AppColors.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const Text(
            'Schedule Site Inspection',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 20),

          // Date picker
          GestureDetector(
            onTap: _pickDate,
            child: Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: Row(
                children: [
                  const Icon(Icons.calendar_today,
                      color: AppColors.primary, size: 20),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      _selectedDate != null
                          ? DateFormat('dd MMM yyyy').format(_selectedDate!)
                          : 'Select date',
                      style: TextStyle(
                        fontSize: 14,
                        color: _selectedDate != null
                            ? AppColors.textPrimary
                            : AppColors.textSecondary,
                      ),
                    ),
                  ),
                  const Icon(Icons.chevron_right,
                      color: AppColors.textSecondary),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Time picker
          GestureDetector(
            onTap: _pickTime,
            child: Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: Row(
                children: [
                  const Icon(Icons.access_time,
                      color: AppColors.primary, size: 20),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      _selectedTime != null
                          ? _selectedTime!.format(context)
                          : 'Select time (optional)',
                      style: TextStyle(
                        fontSize: 14,
                        color: _selectedTime != null
                            ? AppColors.textPrimary
                            : AppColors.textSecondary,
                      ),
                    ),
                  ),
                  const Icon(Icons.chevron_right,
                      color: AppColors.textSecondary),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Notes
          TextField(
            controller: _notesCtrl,
            decoration: InputDecoration(
              hintText: 'Notes (optional)',
              prefixIcon: const Icon(Icons.notes, size: 20),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              isDense: true,
            ),
            maxLines: 2,
            textCapitalization: TextCapitalization.sentences,
          ),

          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!,
                style: const TextStyle(
                    fontSize: 13, color: AppColors.danger)),
          ],

          const SizedBox(height: 20),
          SizedBox(
            height: 50,
            child: FilledButton(
              onPressed: _saving ? null : _save,
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.primary,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14)),
              ),
              child: _saving
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white))
                  : const Text(
                      'Schedule',
                      style: TextStyle(
                          fontSize: 15, fontWeight: FontWeight.w600),
                    ),
            ),
          ),
        ],
      ),
    );
  }
}
