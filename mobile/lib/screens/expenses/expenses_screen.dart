import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../core/theme/app_colors.dart';
import '../../models/expense.dart';
import '../../services/expense_service.dart';
import '../../widgets/common/empty_state.dart';
import '../../widgets/common/file_picker_bottom_sheet.dart';
import '../../widgets/common/loading_overlay.dart';
import '../../widgets/common/shell_scaffold_scope.dart';
import '../../widgets/common/status_badge.dart';

class ExpensesScreen extends StatefulWidget {
  const ExpensesScreen({super.key});

  @override
  State<ExpensesScreen> createState() => _ExpensesScreenState();
}

class _ExpensesScreenState extends State<ExpensesScreen> {
  final _service = ExpenseService();

  List<Expense> _expenses = [];
  bool _loading = true;
  bool _actionLoading = false;
  String? _error;

  // Form state
  final _formKey = GlobalKey<FormState>();
  String _category = Expense.categories.first;
  final _amountCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  DateTime _expenseDate = DateTime.now();
  File? _receiptFile;
  String? _receiptName;

  @override
  void initState() {
    super.initState();
    _loadExpenses();
  }

  @override
  void dispose() {
    _amountCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadExpenses() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      _expenses = await _service.getMyExpenses();
    } catch (e) {
      _error = e.toString();
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  double get _pendingTotal => _expenses
      .where((e) => e.status == 'pending')
      .fold(0.0, (s, e) => s + e.amount);

  double get _approvedTotal => _expenses
      .where((e) => e.status == 'approved')
      .fold(0.0, (s, e) => s + e.amount);

  Future<void> _submitExpense() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _actionLoading = true);
    try {
      final formData = FormData.fromMap({
        'category': _category,
        'amount': double.parse(_amountCtrl.text.trim()),
        'expense_date': DateFormat('yyyy-MM-dd').format(_expenseDate),
        'description': _descCtrl.text.trim(),
        if (_receiptFile != null)
          'receipt': await MultipartFile.fromFile(
            _receiptFile!.path,
            filename: _receiptName ?? 'receipt',
          ),
      });
      await _service.submitExpense(formData);
      _resetForm();
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Expense submitted'),
              backgroundColor: AppColors.success),
        );
      }
      _loadExpenses();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text('Failed: $e'),
              backgroundColor: AppColors.danger),
        );
      }
    } finally {
      if (mounted) setState(() => _actionLoading = false);
    }
  }

  Future<void> _deleteExpense(int id) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Expense?'),
        content: const Text('This action cannot be undone.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppColors.danger),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    setState(() => _actionLoading = true);
    try {
      await _service.deleteExpense(id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Expense deleted'),
              backgroundColor: AppColors.success),
        );
      }
      _loadExpenses();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text('Failed: $e'),
              backgroundColor: AppColors.danger),
        );
      }
    } finally {
      if (mounted) setState(() => _actionLoading = false);
    }
  }

  void _resetForm() {
    _category = Expense.categories.first;
    _amountCtrl.clear();
    _descCtrl.clear();
    _expenseDate = DateTime.now();
    _receiptFile = null;
    _receiptName = null;
  }

  IconData _categoryIcon(String cat) {
    switch (cat) {
      case 'travel':
        return Icons.flight_rounded;
      case 'accommodation':
        return Icons.hotel_rounded;
      case 'meals':
        return Icons.restaurant_rounded;
      case 'equipment':
        return Icons.build_rounded;
      case 'materials':
        return Icons.inventory_2_rounded;
      case 'fuel':
        return Icons.local_gas_station_rounded;
      case 'parking':
        return Icons.local_parking_rounded;
      case 'tools':
        return Icons.handyman_rounded;
      default:
        return Icons.receipt_long_rounded;
    }
  }

  Color _categoryColor(String cat) {
    switch (cat) {
      case 'travel':
        return AppColors.info;
      case 'accommodation':
        return AppColors.primary;
      case 'meals':
        return const Color(0xFFE67E22);
      case 'equipment':
        return AppColors.secondary;
      case 'materials':
        return const Color(0xFF8E44AD);
      case 'fuel':
        return AppColors.danger;
      case 'parking':
        return const Color(0xFF2C3E50);
      case 'tools':
        return AppColors.success;
      default:
        return AppColors.textSecondary;
    }
  }

  @override
  Widget build(BuildContext context) {
    final shellLeading = ShellScaffoldScope.navigationLeading(context);
    return Scaffold(
      appBar: AppBar(
        leading: shellLeading,
        automaticallyImplyLeading: shellLeading == null,
        title: const Text('Expenses'),
        backgroundColor: AppColors.primary,
        foregroundColor: AppColors.white,
        actions: ShellScaffoldScope.notificationActions(),
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.primary,
        foregroundColor: AppColors.white,
        onPressed: _showAddSheet,
        icon: const Icon(Icons.add_rounded),
        label: const Text('Add Expense',
            style: TextStyle(fontWeight: FontWeight.w600)),
      ),
      body: LoadingOverlay(
        isLoading: _actionLoading,
        message: 'Processing...',
        child: _loading
            ? const Center(
                child: CircularProgressIndicator(color: AppColors.primary))
            : _error != null
                ? _buildError()
                : RefreshIndicator(
                    color: AppColors.primary,
                    onRefresh: _loadExpenses,
                    child: ListView(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
                      children: [
                        _buildSummary(),
                        const SizedBox(height: 20),
                        _buildListHeader(),
                        const SizedBox(height: 10),
                        if (_expenses.isEmpty)
                          const Padding(
                            padding: EdgeInsets.only(top: 40),
                            child: EmptyState(
                              icon: Icons.receipt_long_rounded,
                              title: 'No Expenses',
                              subtitle: 'Tap the button below to add one.',
                            ),
                          )
                        else
                          ..._expenses.map(_expenseCard),
                      ],
                    ),
                  ),
      ),
    );
  }

  Widget _buildError() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48, color: AppColors.danger),
            const SizedBox(height: 12),
            Text(_error!, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: _loadExpenses,
              icon: const Icon(Icons.refresh, size: 18),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  // ──────────────────── SUMMARY ────────────────────

  Widget _buildSummary() {
    return Row(
      children: [
        Expanded(child: _summaryTile('Pending', _pendingTotal, AppColors.warning)),
        const SizedBox(width: 12),
        Expanded(
            child: _summaryTile('Approved', _approvedTotal, AppColors.success)),
      ],
    );
  }

  Widget _summaryTile(String label, double amount, Color color) {
    return Card(
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    label == 'Pending'
                        ? Icons.hourglass_top_rounded
                        : Icons.check_circle_rounded,
                    color: color,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 10),
                Text(label,
                    style: const TextStyle(
                        fontSize: 13, color: AppColors.textSecondary)),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              '\$${amount.toStringAsFixed(2)}',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w800,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ──────────────────── LIST ────────────────────

  Widget _buildListHeader() {
    return Row(
      children: [
        const Icon(Icons.list_alt_rounded, size: 20, color: AppColors.primary),
        const SizedBox(width: 8),
        const Expanded(
          child: Text(
            'All Expenses',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
        ),
        Text(
          '${_expenses.length} items',
          style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
        ),
      ],
    );
  }

  Widget _expenseCard(Expense e) {
    final color = _categoryColor(e.category);
    final icon = _categoryIcon(e.category);
    final catLabel = Expense.categoryLabels[e.category] ?? e.category;

    return Card(
      elevation: 1,
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(13),
              ),
              child: Icon(icon, color: color, size: 24),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          catLabel,
                          style: const TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                              color: AppColors.textPrimary),
                        ),
                      ),
                      Text(
                        '\$${e.amount.toStringAsFixed(2)}',
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 15,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      if (e.description != null &&
                          e.description!.isNotEmpty) ...[
                        Expanded(
                          child: Text(
                            e.description!,
                            style: const TextStyle(
                                fontSize: 12, color: AppColors.textSecondary),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 8),
                      ] else
                        const Spacer(),
                      StatusBadge.fromStatus(e.status),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Text(
                        e.expenseDate != null
                            ? DateFormat('dd MMM yyyy').format(e.expenseDate!)
                            : '-',
                        style: const TextStyle(
                            fontSize: 11, color: AppColors.textSecondary),
                      ),
                      if (e.receiptPath != null) ...[
                        const SizedBox(width: 8),
                        const Icon(Icons.attachment_rounded,
                            size: 14, color: AppColors.textSecondary),
                      ],
                      const Spacer(),
                      if (e.status == 'pending')
                        InkWell(
                          onTap: () => _deleteExpense(e.id),
                          borderRadius: BorderRadius.circular(6),
                          child: const Padding(
                            padding: EdgeInsets.all(4),
                            child: Icon(Icons.delete_outline_rounded,
                                size: 18, color: AppColors.danger),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ──────────────────── ADD EXPENSE SHEET ────────────────────

  void _showAddSheet() {
    _resetForm();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
        ),
        child: _addExpenseForm(),
      ),
    );
  }

  Widget _addExpenseForm() {
    return StatefulBuilder(builder: (ctx, setSheetState) {
      return SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
          child: Form(
            key: _formKey,
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
                const SizedBox(height: 16),
                const Text(
                  'Add Expense',
                  style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary),
                ),
                const SizedBox(height: 20),
                DropdownButtonFormField<String>(
                  value: _category,
                  decoration: const InputDecoration(
                    labelText: 'Category',
                    prefixIcon: Icon(Icons.category_rounded),
                    border: OutlineInputBorder(),
                  ),
                  items: Expense.categories
                      .map((c) => DropdownMenuItem(
                          value: c,
                          child: Text(Expense.categoryLabels[c] ?? c)))
                      .toList(),
                  onChanged: (v) {
                    if (v != null) setSheetState(() => _category = v);
                  },
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _amountCtrl,
                        keyboardType: const TextInputType.numberWithOptions(
                            decimal: true),
                        decoration: const InputDecoration(
                          labelText: 'Amount (\$)',
                          prefixIcon: Icon(Icons.attach_money_rounded),
                          border: OutlineInputBorder(),
                        ),
                        validator: (v) {
                          if (v == null || v.trim().isEmpty) {
                            return 'Enter amount';
                          }
                          if (double.tryParse(v.trim()) == null) {
                            return 'Invalid number';
                          }
                          return null;
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextFormField(
                        readOnly: true,
                        decoration: const InputDecoration(
                          labelText: 'Date',
                          prefixIcon: Icon(Icons.calendar_today_rounded),
                          border: OutlineInputBorder(),
                        ),
                        controller: TextEditingController(
                          text: DateFormat('dd/MM/yyyy').format(_expenseDate),
                        ),
                        onTap: () async {
                          final picked = await showDatePicker(
                            context: ctx,
                            initialDate: _expenseDate,
                            firstDate: DateTime.now()
                                .subtract(const Duration(days: 90)),
                            lastDate: DateTime.now(),
                          );
                          if (picked != null) {
                            setSheetState(() => _expenseDate = picked);
                          }
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                TextFormField(
                  controller: _descCtrl,
                  maxLines: 3,
                  decoration: const InputDecoration(
                    labelText: 'Description',
                    alignLabelWithHint: true,
                    prefixIcon: Padding(
                        padding: EdgeInsets.only(bottom: 44),
                        child: Icon(Icons.notes_rounded)),
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 14),
                _receiptUploadTile(setSheetState),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: FilledButton(
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: _actionLoading ? null : _submitExpense,
                    child: const Text('Submit Expense',
                        style: TextStyle(
                            fontSize: 16, fontWeight: FontWeight.w600)),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    });
  }

  Widget _receiptUploadTile(void Function(void Function()) setSheetState) {
    return InkWell(
      onTap: () async {
        final result = await showFilePickerSheet(context);
        if (result != null) {
          setSheetState(() {
            _receiptFile = result.file;
            _receiptName = result.name;
          });
        }
      },
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          border: Border.all(color: AppColors.border),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Icon(
              _receiptFile != null
                  ? Icons.check_circle_rounded
                  : Icons.cloud_upload_rounded,
              color:
                  _receiptFile != null ? AppColors.success : AppColors.primary,
              size: 24,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _receiptFile != null
                        ? _receiptName ?? 'File selected'
                        : 'Upload Receipt',
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                      color: _receiptFile != null
                          ? AppColors.textPrimary
                          : AppColors.textSecondary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (_receiptFile == null)
                    const Text(
                      'Camera, gallery, or file',
                      style: TextStyle(
                          fontSize: 12, color: AppColors.textSecondary),
                    ),
                ],
              ),
            ),
            if (_receiptFile != null)
              InkWell(
                onTap: () => setSheetState(() {
                  _receiptFile = null;
                  _receiptName = null;
                }),
                child: const Icon(Icons.close_rounded,
                    size: 20, color: AppColors.textSecondary),
              ),
          ],
        ),
      ),
    );
  }
}
