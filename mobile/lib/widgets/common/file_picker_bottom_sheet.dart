import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:file_picker/file_picker.dart';
import '../../core/theme/app_colors.dart';

class FilePickerResult {
  final File file;
  final String name;
  final String? mimeType;

  FilePickerResult({required this.file, required this.name, this.mimeType});
}

Future<FilePickerResult?> showFilePickerSheet(BuildContext context,
    {bool imageOnly = false,
    int imageQuality = 85,
    double? maxWidth,
    double? maxHeight}) async {
  return showModalBottomSheet<FilePickerResult>(
    context: context,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (ctx) => _FilePickerSheet(
      imageOnly: imageOnly,
      imageQuality: imageQuality,
      maxWidth: maxWidth,
      maxHeight: maxHeight,
    ),
  );
}

class _FilePickerSheet extends StatelessWidget {
  final bool imageOnly;
  final int imageQuality;
  final double? maxWidth;
  final double? maxHeight;
  const _FilePickerSheet({
    this.imageOnly = false,
    this.imageQuality = 85,
    this.maxWidth,
    this.maxHeight,
  });

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              imageOnly ? 'Select Image' : 'Select File',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const SizedBox(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _OptionTile(
                  icon: Icons.camera_alt_rounded,
                  label: 'Camera',
                  color: AppColors.primary,
                  onTap: () => _pickFromCamera(context),
                ),
                _OptionTile(
                  icon: Icons.photo_library_rounded,
                  label: 'Gallery',
                  color: AppColors.info,
                  onTap: () => _pickFromGallery(context),
                ),
                if (!imageOnly)
                  _OptionTile(
                    icon: Icons.folder_rounded,
                    label: 'Files',
                    color: AppColors.warning,
                    onTap: () => _pickFromFiles(context),
                  ),
              ],
            ),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }

  Future<void> _pickFromCamera(BuildContext context) async {
    final picker = ImagePicker();
    final photo = await picker.pickImage(
      source: ImageSource.camera,
      imageQuality: imageQuality,
      maxWidth: maxWidth,
      maxHeight: maxHeight,
    );
    if (photo != null && context.mounted) {
      Navigator.pop(
        context,
        FilePickerResult(
          file: File(photo.path),
          name: photo.name,
          mimeType: 'image/jpeg',
        ),
      );
    }
  }

  Future<void> _pickFromGallery(BuildContext context) async {
    final picker = ImagePicker();
    final image = await picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: imageQuality,
      maxWidth: maxWidth,
      maxHeight: maxHeight,
    );
    if (image != null && context.mounted) {
      Navigator.pop(
        context,
        FilePickerResult(
          file: File(image.path),
          name: image.name,
          mimeType: _getMimeType(image.name),
        ),
      );
    }
  }

  Future<void> _pickFromFiles(BuildContext context) async {
    final result = await FilePicker.platform.pickFiles();
    if (result != null && result.files.single.path != null && context.mounted) {
      final pf = result.files.single;
      Navigator.pop(
        context,
        FilePickerResult(
          file: File(pf.path!),
          name: pf.name,
          mimeType: _getMimeType(pf.name),
        ),
      );
    }
  }

  String _getMimeType(String name) {
    final ext = name.split('.').last.toLowerCase();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'pdf':
        return 'application/pdf';
      case 'doc':
        return 'application/msword';
      case 'docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      default:
        return 'application/octet-stream';
    }
  }
}

class _OptionTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _OptionTile({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        width: 90,
        padding: const EdgeInsets.symmetric(vertical: 16),
        child: Column(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(icon, color: color, size: 28),
            ),
            const SizedBox(height: 8),
            Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    fontWeight: FontWeight.w500,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}
