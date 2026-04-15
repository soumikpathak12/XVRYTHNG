import 'package:dio/dio.dart';

import '../core/network/api_client.dart';
import '../core/network/api_exceptions.dart';

class CecService {
  final _api = ApiClient();

  Future<Map<String, dynamic>?> getMeta() async {
    try {
      final response = await _api.get('/api/cec/meta');
      final data = response.data['data'] ?? response.data;
      if (data is Map) {
        return Map<String, dynamic>.from(data);
      }
      return null;
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> syncNow({bool force = false}) async {
    try {
      final q = force ? '?force=1' : '';
      await _api.post('/api/cec/sync$q');
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<List<String>> getPvPanelBrands() async {
    try {
      final response = await _api.get('/api/cec/options/pv-panel-brands');
      final data = response.data['data'] ?? response.data;
      if (data is List) return data.map((e) => e.toString()).toList();
      return [];
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<List<String>> getPvPanelModels(String brand) async {
    try {
      final response = await _api.get(
        '/api/cec/options/pv-panel-models',
        queryParameters: {'brand': brand},
      );
      final data = response.data['data'] ?? response.data;
      if (data is List) return data.map((e) => e.toString()).toList();
      return [];
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<Map<String, dynamic>?> getPvPanelDetails(
    String brand,
    String model,
  ) async {
    try {
      final response = await _api.get(
        '/api/cec/options/pv-panel-details',
        queryParameters: {'brand': brand, 'model': model},
      );
      final data = response.data['data'] ?? response.data;
      if (data is Map) return Map<String, dynamic>.from(data);
      return null;
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<List<String>> getInverterBrands() async {
    try {
      final response = await _api.get('/api/cec/options/inverter-brands');
      final data = response.data['data'] ?? response.data;
      if (data is List) return data.map((e) => e.toString()).toList();
      return [];
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<List<String>> getInverterModels(String brand) async {
    try {
      final response = await _api.get(
        '/api/cec/options/inverter-models',
        queryParameters: {'brand': brand},
      );
      final data = response.data['data'] ?? response.data;
      if (data is List) return data.map((e) => e.toString()).toList();
      return [];
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<List<String>> getInverterSeries(String brand, String model) async {
    try {
      final response = await _api.get(
        '/api/cec/options/inverter-series',
        queryParameters: {'brand': brand, 'model': model},
      );
      final data = response.data['data'] ?? response.data;
      if (data is List) return data.map((e) => e.toString()).toList();
      return [];
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<Map<String, dynamic>?> getInverterDetails(
    String brand,
    String model,
  ) async {
    try {
      final response = await _api.get(
        '/api/cec/options/inverter-details',
        queryParameters: {'brand': brand, 'model': model},
      );
      final data = response.data['data'] ?? response.data;
      if (data is Map) return Map<String, dynamic>.from(data);
      return null;
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<List<String>> getBatteryBrands() async {
    try {
      final response = await _api.get('/api/cec/options/battery-brands');
      final data = response.data['data'] ?? response.data;
      if (data is List) return data.map((e) => e.toString()).toList();
      return [];
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<List<String>> getBatteryModels(String brand) async {
    try {
      final response = await _api.get(
        '/api/cec/options/battery-models',
        queryParameters: {'brand': brand},
      );
      final data = response.data['data'] ?? response.data;
      if (data is List) return data.map((e) => e.toString()).toList();
      return [];
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
