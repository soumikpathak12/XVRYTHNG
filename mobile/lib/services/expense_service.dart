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
      await _api.delete('/api/employees/expenses/$id');
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
