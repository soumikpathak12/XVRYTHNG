import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_colors.dart';
import '../../models/employee.dart';
import '../../providers/employees_provider.dart';
import '../../widgets/common/empty_state.dart';
import '../../widgets/common/shell_scaffold_scope.dart';
import '../../widgets/common/status_badge.dart';

class EmployeesScreen extends StatefulWidget {
  const EmployeesScreen({super.key});

  @override
  State<EmployeesScreen> createState() => _EmployeesScreenState();
}

class _EmployeesScreenState extends State<EmployeesScreen> {
  final _searchController = TextEditingController();
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<EmployeesProvider>().loadEmployees();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  void _onSearchChanged(String query) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () {
      context.read<EmployeesProvider>().loadEmployees(search: query);
    });
  }

  Future<void> _refresh() =>
      context.read<EmployeesProvider>().loadEmployees(
            search: _searchController.text,
          );

  @override
  Widget build(BuildContext context) {
    final shellLeading = ShellScaffoldScope.navigationLeading(context);
    return Scaffold(
      appBar: AppBar(
        leading: shellLeading,
        automaticallyImplyLeading: shellLeading == null,
        title: const Text('Employees'),
        actions: ShellScaffoldScope.notificationActions(),
      ),
      body: Consumer<EmployeesProvider>(
        builder: (context, provider, _) {
          return Column(
            children: [
              _buildStatCards(provider),
              _buildSearchBar(),
              Expanded(child: _buildList(provider)),
            ],
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.primary,
        foregroundColor: AppColors.white,
        icon: const Icon(Icons.person_add),
        label: const Text('Add Employee'),
        onPressed: () {
          final loc = GoRouterState.of(context).matchedLocation;
          if (loc.contains('/admin')) {
            context.push('/admin/employees/new');
          } else {
            context.push('/dashboard/employees/new');
          }
        },
      ),
    );
  }

  Widget _buildStatCards(EmployeesProvider provider) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
      child: Row(
        children: [
          _StatCard(
            title: 'Total',
            value: provider.employees.length.toString(),
            icon: Icons.people_outline,
            color: AppColors.primary,
          ),
          const SizedBox(width: 10),
          _StatCard(
            title: 'Active',
            value: provider.activeCount.toString(),
            icon: Icons.check_circle_outline,
            color: AppColors.success,
          ),
          const SizedBox(width: 10),
          _StatCard(
            title: 'Inactive',
            value: provider.inactiveCount.toString(),
            icon: Icons.pause_circle_outline,
            color: AppColors.danger,
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: TextField(
        controller: _searchController,
        onChanged: _onSearchChanged,
        decoration: InputDecoration(
          hintText: 'Search employees...',
          prefixIcon: const Icon(Icons.search, color: AppColors.textSecondary),
          suffixIcon: _searchController.text.isNotEmpty
              ? IconButton(
                  icon: const Icon(Icons.clear, size: 20),
                  onPressed: () {
                    _searchController.clear();
                    _onSearchChanged('');
                  },
                )
              : null,
          filled: true,
          fillColor: AppColors.surface,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide.none,
          ),
        ),
      ),
    );
  }

  Widget _buildList(EmployeesProvider provider) {
    if (provider.loading && provider.employees.isEmpty) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.primary),
      );
    }
    if (provider.error != null && provider.employees.isEmpty) {
      return EmptyState(
        icon: Icons.error_outline,
        title: 'Failed to load employees',
        subtitle: provider.error,
        actionLabel: 'Retry',
        onAction: _refresh,
      );
    }
    if (provider.employees.isEmpty) {
      return const EmptyState(
        icon: Icons.people_outline,
        title: 'No employees found',
        subtitle: 'Employees will appear here.',
      );
    }
    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: _refresh,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 100),
        itemCount: provider.employees.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (context, index) {
          final emp = provider.employees[index];
          return _EmployeeCard(
            employee: emp,
            onTap: () => _openProfile(emp),
          );
        },
      ),
    );
  }

  void _openProfile(Employee employee) {
    final loc = GoRouterState.of(context).matchedLocation;
    final base = loc.contains('/admin')
        ? '/admin/employees'
        : '/dashboard/employees';
    context.push('$base/${employee.id}');
  }
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------
class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;

  const _StatCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: color.withOpacity(0.06),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withOpacity(0.15)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 22, color: color),
            const SizedBox(height: 8),
            Text(
              value,
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              title,
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Employee card
// ---------------------------------------------------------------------------
class _EmployeeCard extends StatelessWidget {
  final Employee employee;
  final VoidCallback onTap;

  const _EmployeeCard({required this.employee, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: AppColors.border, width: 0.5),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              _avatar(),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      employee.fullName,
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 15,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    if (employee.employeeCode != null)
                      Text(
                        employee.employeeCode!,
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        if (employee.roleName != null || employee.role != null) ...[
                          Icon(Icons.work_outline, size: 14, color: AppColors.textSecondary),
                          const SizedBox(width: 4),
                          Flexible(
                            child: Text(
                              employee.roleName ?? employee.role ?? '',
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppColors.textSecondary,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                        if (employee.departmentName != null ||
                            employee.department != null) ...[
                          const SizedBox(width: 12),
                          Icon(Icons.business_outlined,
                              size: 14, color: AppColors.textSecondary),
                          const SizedBox(width: 4),
                          Flexible(
                            child: Text(
                              employee.departmentName ?? employee.department ?? '',
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppColors.textSecondary,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              StatusBadge.fromStatus(employee.status),
            ],
          ),
        ),
      ),
    );
  }

  Widget _avatar() {
    final initials = '${employee.firstName.isNotEmpty ? employee.firstName[0] : ''}'
        '${employee.lastName.isNotEmpty ? employee.lastName[0] : ''}';
    if (employee.avatarUrl != null && employee.avatarUrl!.isNotEmpty) {
      return CircleAvatar(
        radius: 22,
        backgroundImage: NetworkImage(employee.avatarUrl!),
        onBackgroundImageError: (_, __) {},
        backgroundColor: AppColors.primary.withOpacity(0.1),
      );
    }
    return CircleAvatar(
      radius: 22,
      backgroundColor: AppColors.primary.withOpacity(0.1),
      child: Text(
        initials.toUpperCase(),
        style: const TextStyle(
          color: AppColors.primary,
          fontWeight: FontWeight.w600,
          fontSize: 15,
        ),
      ),
    );
  }
}
