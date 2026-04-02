import 'package:flutter/foundation.dart';
import '../models/employee.dart';
import '../services/employees_service.dart';

class EmployeesProvider extends ChangeNotifier {
  final EmployeesService _service = EmployeesService();

  List<Employee> _employees = [];
  Map<String, dynamic>? _employeeDetail;
  List<JobRole> _jobRoles = [];
  bool _loading = false;
  String? _error;

  List<Employee> get employees => _employees;
  Map<String, dynamic>? get employeeDetail => _employeeDetail;
  List<JobRole> get jobRoles => _jobRoles;
  bool get loading => _loading;
  String? get error => _error;

  int get activeCount => _employees.where((e) => e.status == 'active').length;
  int get inactiveCount =>
      _employees.where((e) => e.status == 'inactive').length;

  Future<void> loadEmployees(
      {String? search, int? companyId, int? jobRoleId, String? status}) async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      _employees = await _service.listEmployees(
          search: search,
          companyId: companyId,
          jobRoleId: jobRoleId,
          status: status);
    } catch (e) {
      _error = e.toString();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> loadEmployeeDetail(int id, {int? companyId}) async {
    _loading = true;
    notifyListeners();
    try {
      _employeeDetail =
          await _service.getEmployee(id, companyId: companyId);
    } catch (e) {
      _error = e.toString();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> loadJobRoles({int? companyId}) async {
    try {
      _jobRoles = await _service.getJobRoleOptions(companyId: companyId);
      notifyListeners();
    } catch (_) {}
  }

  Future<int> createEmployee(Map<String, dynamic> data,
      {int? companyId}) async {
    try {
      return await _service.createEmployee(data, companyId: companyId);
    } catch (e) {
      rethrow;
    }
  }
}
