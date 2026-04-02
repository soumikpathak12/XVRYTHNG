import 'dart:io';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../../core/theme/app_colors.dart';
import '../../services/leads_service.dart';

/// Screen / dialog for importing leads from a CSV file.
class ImportLeadsScreen extends StatefulWidget {
  const ImportLeadsScreen({super.key});

  @override
  State<ImportLeadsScreen> createState() => _ImportLeadsScreenState();
}

class _ImportLeadsScreenState extends State<ImportLeadsScreen> {
  final _service = LeadsService();
  PlatformFile? _selectedFile;
  bool _uploading = false;
  String? _error;
  Map<String, dynamic>? _result;

  Future<void> _pickFile() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['csv'],
    );
    if (result != null && result.files.isNotEmpty) {
      setState(() {
        _selectedFile = result.files.first;
        _error = null;
        _result = null;
      });
    }
  }

  Future<void> _upload() async {
    if (_selectedFile == null || _selectedFile!.path == null) return;

    setState(() {
      _uploading = true;
      _error = null;
      _result = null;
    });

    try {
      final file = File(_selectedFile!.path!);
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(
          file.path,
          filename: _selectedFile!.name,
        ),
      });

      final result = await _service.importLeadsCsv(formData);
      setState(() => _result = result);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Import Leads (CSV)')),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Instructions
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.info.withOpacity(0.06),
                borderRadius: BorderRadius.circular(14),
                border:
                    Border.all(color: AppColors.info.withOpacity(0.2)),
              ),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.info_outline,
                          color: AppColors.info, size: 20),
                      SizedBox(width: 8),
                      Text(
                        'CSV Format',
                        style: TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 14,
                            color: AppColors.textPrimary),
                      ),
                    ],
                  ),
                  SizedBox(height: 8),
                  Text(
                    'Your CSV file should have headers:\ncustomer_name, email, phone, suburb, address, system_size, value, source',
                    style: TextStyle(
                        fontSize: 12, color: AppColors.textSecondary),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // File picker
            GestureDetector(
              onTap: _uploading ? null : _pickFile,
              child: Container(
                padding: const EdgeInsets.all(30),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: _selectedFile != null
                        ? AppColors.primary
                        : AppColors.border,
                    style: BorderStyle.solid,
                  ),
                ),
                child: Column(
                  children: [
                    Icon(
                      _selectedFile != null
                          ? Icons.description
                          : Icons.cloud_upload_outlined,
                      size: 42,
                      color: _selectedFile != null
                          ? AppColors.primary
                          : AppColors.textSecondary,
                    ),
                    const SizedBox(height: 10),
                    Text(
                      _selectedFile != null
                          ? _selectedFile!.name
                          : 'Tap to select CSV file',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: _selectedFile != null
                            ? AppColors.textPrimary
                            : AppColors.textSecondary,
                      ),
                    ),
                    if (_selectedFile != null)
                      Text(
                        '${(_selectedFile!.size / 1024).toStringAsFixed(1)} KB',
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                        ),
                      ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 20),

            // Upload button
            SizedBox(
              height: 52,
              child: FilledButton.icon(
                onPressed:
                    _selectedFile != null && !_uploading ? _upload : null,
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14)),
                ),
                icon: _uploading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.upload_file),
                label: Text(_uploading ? 'Importing...' : 'Import Leads'),
              ),
            ),

            const SizedBox(height: 20),

            // Error
            if (_error != null)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.danger.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error,
                        color: AppColors.danger, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                        child: Text(_error!,
                            style: const TextStyle(
                                fontSize: 13,
                                color: AppColors.danger))),
                  ],
                ),
              ),

            // Success result
            if (_result != null)
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.success.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                      color: AppColors.success.withOpacity(0.3)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.check_circle,
                            color: AppColors.success, size: 22),
                        SizedBox(width: 8),
                        Text(
                          'Import Complete',
                          style: TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 14,
                              color: AppColors.success),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    if (_result!['imported'] != null)
                      Text(
                          '✓ ${_result!['imported']} lead(s) imported',
                          style: const TextStyle(fontSize: 13)),
                    if (_result!['skipped'] != null)
                      Text('⊘ ${_result!['skipped']} skipped',
                          style: const TextStyle(fontSize: 13)),
                    if (_result!['errors'] != null &&
                        (_result!['errors'] as List).isNotEmpty) ...[
                      const SizedBox(height: 8),
                      const Text('Errors:',
                          style: TextStyle(
                              fontWeight: FontWeight.w600, fontSize: 13)),
                      ...(_result!['errors'] as List)
                          .take(5)
                          .map((e) => Text('• $e',
                              style: const TextStyle(
                                  fontSize: 12,
                                  color: AppColors.danger))),
                    ],
                  ],
                ),
              ),

            const Spacer(),

            // Done button (after import)
            if (_result != null)
              SizedBox(
                height: 48,
                child: OutlinedButton(
                  onPressed: () => Navigator.pop(context, true),
                  style: OutlinedButton.styleFrom(
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14)),
                  ),
                  child: const Text('Done'),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
