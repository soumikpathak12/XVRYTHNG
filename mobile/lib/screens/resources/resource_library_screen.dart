import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/config/api_config.dart';
import '../../core/theme/app_colors.dart';
import '../../services/resource_library_service.dart';
import '../../widgets/common/empty_state.dart';

class ResourceLibraryScreen extends StatefulWidget {
  const ResourceLibraryScreen({super.key});

  @override
  State<ResourceLibraryScreen> createState() => _ResourceLibraryScreenState();
}

class _ResourceLibraryScreenState extends State<ResourceLibraryScreen> {
  final _service = ResourceLibraryService();
  final _picker = ImagePicker();
  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _items = const [];
  String _selectedSectionFilter = 'All';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final items = await _service.listResources();
      if (!mounted) return;
      setState(() {
        _items = items;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  Future<void> _openImageViewer(String imageUrl, {String? title}) async {
    if (!mounted || imageUrl.trim().isEmpty) return;
    await showDialog<void>(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: Colors.black87,
        insetPadding: const EdgeInsets.all(10),
        child: Stack(
          children: [
            InteractiveViewer(
              minScale: 1,
              maxScale: 4,
              child: Center(
                child: Image.network(
                  imageUrl,
                  fit: BoxFit.contain,
                  errorBuilder: (_, __, ___) => const Padding(
                    padding: EdgeInsets.all(24),
                    child: Icon(Icons.broken_image_outlined, color: Colors.white70, size: 40),
                  ),
                ),
              ),
            ),
            Positioned(
              right: 8,
              top: 8,
              child: IconButton(
                onPressed: () => Navigator.pop(ctx),
                icon: const Icon(Icons.close, color: Colors.white),
              ),
            ),
            if ((title ?? '').trim().isNotEmpty)
              Positioned(
                left: 12,
                right: 48,
                top: 12,
                child: Text(
                  title!,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _addResource() async {
    final titleCtrl = TextEditingController();
    final linkCtrl = TextEditingController();
    final notesCtrl = TextEditingController();
    String category = 'sticker';
    String type = 'photo';
    String sectionChoice = _sections.firstWhere(
      (s) => s != 'All',
      orElse: () => 'General',
    );
    bool createNewSection = false;
    final sectionNewCtrl = TextEditingController();
    XFile? pickedPhoto;
    bool saving = false;

    final created = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (sheetCtx) {
        return StatefulBuilder(
          builder: (sheetCtx, setSheet) {
            final bottom = MediaQuery.of(sheetCtx).viewInsets.bottom;
            return Padding(
              padding: EdgeInsets.fromLTRB(16, 16, 16, bottom + 16),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Add Resource Reference',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: titleCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Title',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 10),
                    DropdownButtonFormField<String>(
                      value: sectionChoice,
                      decoration: const InputDecoration(
                        labelText: 'Section',
                        border: OutlineInputBorder(),
                      ),
                      items: [
                        ..._sections
                            .where((s) => s != 'All')
                            .map(
                              (s) => DropdownMenuItem(value: s, child: Text(s)),
                            ),
                        const DropdownMenuItem(
                          value: '__new__',
                          child: Text('Create new section'),
                        ),
                      ],
                      onChanged: (v) {
                        if (v == null) return;
                        setSheet(() {
                          sectionChoice = v;
                          createNewSection = v == '__new__';
                        });
                      },
                    ),
                    if (createNewSection) ...[
                      const SizedBox(height: 10),
                      TextField(
                        controller: sectionNewCtrl,
                        decoration: const InputDecoration(
                          labelText: 'New section name',
                          border: OutlineInputBorder(),
                        ),
                      ),
                    ],
                    const SizedBox(height: 10),
                    DropdownButtonFormField<String>(
                      value: category,
                      decoration: const InputDecoration(
                        labelText: 'Category',
                        border: OutlineInputBorder(),
                      ),
                      items: const [
                        DropdownMenuItem(
                          value: 'sticker',
                          child: Text('Sticker'),
                        ),
                        DropdownMenuItem(
                          value: 'installation',
                          child: Text('Installation'),
                        ),
                        DropdownMenuItem(
                          value: 'general',
                          child: Text('General'),
                        ),
                      ],
                      onChanged: (v) {
                        if (v == null) return;
                        setSheet(() => category = v);
                      },
                    ),
                    const SizedBox(height: 10),
                    DropdownButtonFormField<String>(
                      value: type,
                      decoration: const InputDecoration(
                        labelText: 'Type',
                        border: OutlineInputBorder(),
                      ),
                      items: const [
                        DropdownMenuItem(value: 'photo', child: Text('Photo')),
                        DropdownMenuItem(value: 'link', child: Text('Link')),
                      ],
                      onChanged: (v) {
                        if (v == null) return;
                        setSheet(() => type = v);
                      },
                    ),
                    const SizedBox(height: 10),
                    if (type == 'photo')
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (pickedPhoto != null)
                            ClipRRect(
                              borderRadius: BorderRadius.circular(10),
                              child: Image.file(
                                File(pickedPhoto!.path),
                                height: 180,
                                width: double.infinity,
                                fit: BoxFit.contain,
                              ),
                            )
                          else
                            Container(
                              height: 120,
                              width: double.infinity,
                              decoration: BoxDecoration(
                                color: AppColors.surface,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: AppColors.border),
                              ),
                              alignment: Alignment.center,
                              child: const Text('Choose photo from gallery/camera'),
                            ),
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: saving
                                      ? null
                                      : () async {
                                          final file = await _picker.pickImage(
                                            source: ImageSource.gallery,
                                          );
                                          if (file == null || !mounted || !sheetCtx.mounted) return;
                                          setSheet(() => pickedPhoto = file);
                                        },
                                  icon: const Icon(Icons.photo_library_outlined),
                                  label: const Text('Gallery'),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: saving
                                      ? null
                                      : () async {
                                          final file = await _picker.pickImage(
                                            source: ImageSource.camera,
                                          );
                                          if (file == null || !mounted || !sheetCtx.mounted) return;
                                          setSheet(() => pickedPhoto = file);
                                        },
                                  icon: const Icon(Icons.photo_camera_outlined),
                                  label: const Text('Camera'),
                                ),
                              ),
                            ],
                          ),
                        ],
                      )
                    else
                      TextField(
                        controller: linkCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Link URL',
                          border: OutlineInputBorder(),
                        ),
                      ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: notesCtrl,
                      minLines: 2,
                      maxLines: 3,
                      decoration: const InputDecoration(
                        labelText: 'Notes (optional)',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: saving
                                ? null
                                : () => Navigator.pop(sheetCtx, false),
                            child: const Text('Cancel'),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: FilledButton(
                            onPressed: saving
                                ? null
                                : () async {
                                    setSheet(() => saving = true);
                                    try {
                                      final sectionName = createNewSection
                                          ? sectionNewCtrl.text.trim()
                                          : sectionChoice;
                                      if (sectionName.isEmpty) {
                                        throw Exception('Section is required');
                                      }
                                      String? uploadedImageUrl;
                                      if (type == 'photo') {
                                        if (pickedPhoto == null) {
                                          throw Exception('Please choose a photo');
                                        }
                                        uploadedImageUrl = await _service.uploadPhoto(
                                          pickedPhoto!.path,
                                        );
                                      }
                                      await _service.createResource(
                                        title: titleCtrl.text.trim(),
                                        category: category,
                                        sectionName: sectionName,
                                        resourceType: type,
                                        imageUrl: uploadedImageUrl,
                                        linkUrl: linkCtrl.text.trim(),
                                        notes: notesCtrl.text.trim(),
                                      );
                                      if (!mounted || !sheetCtx.mounted) return;
                                      Navigator.of(sheetCtx).pop(true);
                                    } catch (e) {
                                      if (!mounted || !sheetCtx.mounted) return;
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(content: Text('$e')),
                                      );
                                      setSheet(() => saving = false);
                                    }
                                  },
                            child: saving
                                ? const SizedBox(
                                    height: 18,
                                    width: 18,
                                    child: CircularProgressIndicator(strokeWidth: 2),
                                  )
                                : const Text('Save'),
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

    // Keep local controllers alive until after bottom-sheet teardown completes.
    // Disposing immediately here can race with input teardown on some devices.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      titleCtrl.dispose();
      linkCtrl.dispose();
      notesCtrl.dispose();
      sectionNewCtrl.dispose();
    });
    if (created == true) await _load();
  }

  Future<void> _deleteItem(Map<String, dynamic> item) async {
    final id = int.tryParse(item['id']?.toString() ?? '');
    if (id == null) return;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete resource'),
        content: const Text('Do you want to remove this reference item?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Delete')),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await _service.deleteResource(id);
      if (!mounted) return;
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  Future<void> _openExternal(String raw) async {
    final resolved = _resolveUrl(raw);
    final uri = Uri.tryParse(resolved);
    if (uri == null) return;
    final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!opened && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not open link')),
      );
    }
  }

  bool _canGoBack(BuildContext context) => Navigator.of(context).canPop();

  @override
  Widget build(BuildContext context) {
    final sections = _sections;
    final filteredItems = _selectedSectionFilter == 'All'
        ? _items
        : _items.where((e) {
            final section = (e['section_name'] ?? 'General').toString();
            return section == _selectedSectionFilter;
          }).toList();

    if (_loading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator(color: AppColors.primary)),
      );
    }
    if (_error != null) {
      final canGoBack = _canGoBack(context);
      return Scaffold(
        appBar: AppBar(
          title: const Text('Resource Library'),
          automaticallyImplyLeading: false,
          leading: canGoBack
              ? IconButton(
                  tooltip: 'Back',
                  icon: const Icon(Icons.arrow_back),
                  onPressed: () => Navigator.of(context).maybePop(),
                )
              : null,
        ),
        body: EmptyState(
          icon: Icons.error_outline,
          title: 'Failed to load resources',
          subtitle: _error,
          actionLabel: 'Retry',
          onAction: _load,
        ),
      );
    }

    final canGoBack = _canGoBack(context);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Resource Library'),
        automaticallyImplyLeading: false,
        leading: canGoBack
            ? IconButton(
                tooltip: 'Back',
                icon: const Icon(Icons.arrow_back),
                onPressed: () => Navigator.of(context).maybePop(),
              )
            : null,
        actions: [
          IconButton(
            tooltip: 'Add',
            onPressed: _addResource,
            icon: const Icon(Icons.add),
          ),
        ],
      ),
      body: _items.isEmpty
          ? EmptyState(
              icon: Icons.menu_book_outlined,
              title: 'No resources yet',
              subtitle: 'Add sticker/installation references to share with the team.',
              actionLabel: 'Add Resource',
              onAction: _addResource,
            )
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: filteredItems.length + 1,
                separatorBuilder: (_, __) => const SizedBox(height: 10),
                itemBuilder: (context, index) {
                  if (index == 0) {
                    return SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: sections.map((section) {
                          return Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: ChoiceChip(
                              label: Text(section),
                              selected: _selectedSectionFilter == section,
                              onSelected: (_) {
                                setState(() => _selectedSectionFilter = section);
                              },
                            ),
                          );
                        }).toList(),
                      ),
                    );
                  }
                  final item = filteredItems[index - 1];
                  final title = item['title']?.toString() ?? 'Resource';
                  final category = item['category']?.toString() ?? 'general';
                  final sectionName =
                      item['section_name']?.toString().trim().isNotEmpty == true
                          ? item['section_name'].toString().trim()
                          : 'General';
                  final type = item['resource_type']?.toString() ?? 'photo';
                  final imageUrl = _resolveUrl(item['image_url']?.toString() ?? '');
                  final linkUrl = _resolveUrl(item['link_url']?.toString() ?? '');
                  final notes = item['notes']?.toString() ?? '';
                  final creator = item['created_by_name']?.toString() ?? '';

                  return Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (type == 'photo' && imageUrl.trim().isNotEmpty)
                          ClipRRect(
                            borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                            child: GestureDetector(
                              onTap: () => _openImageViewer(imageUrl, title: title),
                              child: AspectRatio(
                                aspectRatio: 16 / 9,
                                child: Image.network(
                                  imageUrl,
                                  fit: BoxFit.contain,
                                  errorBuilder: (_, __, ___) => Container(
                                    color: AppColors.surface,
                                    alignment: Alignment.center,
                                    child: const Icon(Icons.broken_image_outlined),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        Padding(
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      title,
                                      style: const TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w700,
                                        color: AppColors.textPrimary,
                                      ),
                                    ),
                                  ),
                                  PopupMenuButton<String>(
                                    onSelected: (v) {
                                      if (v == 'delete') _deleteItem(item);
                                    },
                                    itemBuilder: (_) => const [
                                      PopupMenuItem(
                                        value: 'delete',
                                        child: Text('Delete'),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '$sectionName • ${category[0].toUpperCase()}${category.substring(1)} • ${type.toUpperCase()}',
                                style: const TextStyle(
                                  color: AppColors.textSecondary,
                                  fontSize: 12,
                                ),
                              ),
                              if (creator.isNotEmpty) ...[
                                const SizedBox(height: 4),
                                Text(
                                  'Added by: $creator',
                                  style: const TextStyle(
                                    color: AppColors.textSecondary,
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                              if (notes.isNotEmpty) ...[
                                const SizedBox(height: 8),
                                Text(notes),
                              ],
                              if (linkUrl.trim().isNotEmpty) ...[
                                const SizedBox(height: 8),
                                TextButton.icon(
                                  onPressed: () => _openExternal(linkUrl),
                                  icon: const Icon(Icons.open_in_new, size: 15),
                                  label: const Text('Open link'),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _addResource,
        icon: const Icon(Icons.add),
        label: const Text('Add'),
      ),
    );
  }

  List<String> get _sections {
    final set = <String>{'All'};
    for (final item in _items) {
      final s = (item['section_name'] ?? '').toString().trim();
      if (s.isNotEmpty) set.add(s);
    }
    if (set.length == 1) set.add('General');
    return set.toList();
  }
}

String _resolveUrl(String raw) {
  final value = raw.trim();
  if (value.isEmpty) return '';
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  if (value.startsWith('/')) return '${ApiConfig.baseUrl}$value';
  return '${ApiConfig.baseUrl}/$value';
}
