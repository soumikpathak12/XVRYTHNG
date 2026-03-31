import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../models/company.dart';
import 'company_create_screen.dart';
import '../../services/companies_service.dart';
import '../../widgets/common/empty_state.dart';
import '../../widgets/common/shell_scaffold_scope.dart';
import '../../widgets/common/status_badge.dart';

class CompaniesScreen extends StatefulWidget {
  const CompaniesScreen({super.key});

  @override
  State<CompaniesScreen> createState() => _CompaniesScreenState();
}

class _CompaniesScreenState extends State<CompaniesScreen> {
  final _service = CompaniesService();
  final _searchCtrl = TextEditingController();

  List<Company> _companies = [];
  List<Company> _filtered = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
    _searchCtrl.addListener(_applySearch);
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      _companies = await _service.listCompanies();
      _applySearch();
    } catch (e) {
      _error = e.toString();
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _applySearch() {
    final q = _searchCtrl.text.trim().toLowerCase();
    setState(() {
      _filtered = q.isEmpty
          ? _companies
          : _companies.where((c) {
              return c.name.toLowerCase().contains(q) ||
                  (c.email?.toLowerCase().contains(q) ?? false) ||
                  (c.abn?.toLowerCase().contains(q) ?? false);
            }).toList();
    });
  }

  Future<void> _openCreatePage() async {
    final created = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => const CompanyCreateScreen()),
    );
    if (created == true) {
      await _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    final shellLeading = ShellScaffoldScope.navigationLeading(context);
    return Scaffold(
      appBar: AppBar(
        leading: shellLeading,
        automaticallyImplyLeading: shellLeading == null,
        title: const Text('Companies'),
        actions: [
          ...ShellScaffoldScope.notificationActions(context: context),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? _buildError()
                : _buildBody(),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _openCreatePage,
        tooltip: 'Add Partner Company',
        backgroundColor: AppColors.primary,
        child: const Icon(Icons.add_business, color: AppColors.white),
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
            Icon(Icons.error_outline, size: 48, color: AppColors.danger),
            const SizedBox(height: 12),
            Text(_error!, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            FilledButton(onPressed: _load, child: const Text('Retry')),
          ],
        ),
      ),
    );
  }

  Widget _buildBody() {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
          child: TextField(
            controller: _searchCtrl,
            decoration: InputDecoration(
              hintText: 'Search companies...',
              prefixIcon: const Icon(Icons.search),
              filled: true,
              fillColor: AppColors.surface,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide.none,
              ),
              suffixIcon: _searchCtrl.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () {
                        _searchCtrl.clear();
                      },
                    )
                  : null,
            ),
          ),
        ),
        Expanded(
          child: _filtered.isEmpty
              ? const EmptyState(
                  icon: Icons.business_outlined,
                  title: 'No Companies Found',
                  subtitle:
                      'Companies will appear here once added.',
                )
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: _filtered.length,
                  itemBuilder: (_, i) => _buildCompanyCard(_filtered[i]),
                ),
        ),
      ],
    );
  }

  Widget _buildCompanyCard(Company c) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      elevation: 0,
      color: AppColors.surface,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 22,
                  backgroundColor: AppColors.primary.withOpacity(0.1),
                  child: Text(
                    c.name.isNotEmpty ? c.name[0].toUpperCase() : '?',
                    style: const TextStyle(
                      color: AppColors.primary,
                      fontWeight: FontWeight.bold,
                      fontSize: 18,
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        c.name,
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 16,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      if (c.companyType != null)
                        Text(
                          c.companyType!,
                          style: const TextStyle(
                            fontSize: 13,
                            color: AppColors.textSecondary,
                          ),
                        ),
                    ],
                  ),
                ),
                StatusBadge.fromStatus(c.status),
              ],
            ),
            const SizedBox(height: 12),
            const Divider(height: 1, color: AppColors.divider),
            const SizedBox(height: 12),
            Row(
              children: [
                if (c.email != null) ...[
                  const Icon(Icons.email_outlined,
                      size: 14, color: AppColors.textSecondary),
                  const SizedBox(width: 4),
                  Flexible(
                    child: Text(
                      c.email!,
                      style: const TextStyle(
                          fontSize: 13, color: AppColors.textSecondary),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
                const Spacer(),
                if (c.phone != null) ...[
                  const Icon(Icons.phone_outlined,
                      size: 14, color: AppColors.textSecondary),
                  const SizedBox(width: 4),
                  Text(
                    c.phone!,
                    style: const TextStyle(
                        fontSize: 13, color: AppColors.textSecondary),
                  ),
                ],
              ],
            ),
            if (c.abn != null && c.abn!.isNotEmpty) ...[
              const SizedBox(height: 6),
              Row(
                children: [
                  const Icon(Icons.badge_outlined,
                      size: 14, color: AppColors.textSecondary),
                  const SizedBox(width: 4),
                  Text(
                    'ABN: ${c.abn}',
                    style: const TextStyle(
                        fontSize: 12, color: AppColors.textSecondary),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
