import 'package:dio/dio.dart';
import '../core/network/api_client.dart';
import '../core/network/api_exceptions.dart';
import '../models/expense.dart';

class ExpenseService {
  final _api = ApiClient();

  Future<List<Expense>> getMyExpenses() async {
    try {
      final response = await _api.get('/api/employees/expenses');
      final data = response.data['data'] ?? response.data;
      if (data is List) {
        return data.map((e) => Expense.fromJson(e)).toList();
      }
      return [];
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> submitExpense(FormData formData) async {
    try {
      await _api.upload('/api/employees/expenses', formData);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> deleteExpense(int id) async {
    try {
      await _api.delete('/api/employees/expenses/$id/cancel');
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// GET /api/employees/expenses/pending — admin: pending expense list
  Future<List<Expense>> getPendingExpenses() async {
    try {
      final response = await _api.get('/api/employees/expenses/pending');
      final data = response.data['data'] ?? response.data;
      if (data is List) {
        return data.map((e) => Expense.fromJson(e)).toList();
      }
      return [];
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// PATCH /api/employees/expenses/:id/review — approve or reject with comment
  Future<void> reviewExpense(int id, String action, {String? comment}) async {
    try {
      await _api.patch('/api/employees/expenses/$id/review', data: {
        'action': action,
        if (comment != null) 'reviewerNote': comment,
      });
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}

