import 'package:dio/dio.dart';
import '../core/network/api_client.dart';
import '../core/network/api_exceptions.dart';
import '../models/lead.dart';

class LeadsService {
  final _api = ApiClient();

  Future<List<Lead>> getLeads({
    String? search,
    String? stage,
    String? salesSegment,
  }) async {
    try {
      final params = <String, dynamic>{};
      if (search != null && search.isNotEmpty) params['search'] = search;
      if (stage != null && stage.isNotEmpty) params['stage'] = stage;
      if (salesSegment != null &&
          (salesSegment == 'b2c' || salesSegment == 'b2b')) {
        params['sales_segment'] = salesSegment;
      }
      final response = await _api.get('/api/leads', queryParameters: params);
      final data = response.data['data'] ?? response.data;
      if (data is List) {
        return data.map((e) => Lead.fromJson(e)).toList();
      }
      return [];
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<Map<String, dynamic>> getLead(int id) async {
    try {
      final response = await _api.get('/api/leads/$id');
      return Map<String, dynamic>.from(response.data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<Lead> createLead(Map<String, dynamic> data) async {
    try {
      final response = await _api.post('/api/leads', data: data);
      return Lead.fromJson(response.data['data'] ?? response.data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> updateLead(int id, Map<String, dynamic> data) async {
    try {
      await _api.put('/api/leads/$id', data: data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> updateLeadStage(int id, String stage) async {
    try {
      await _api.patch('/api/leads/$id/stage', data: {'stage': stage});
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> addLeadNote(int id, String note) async {
    try {
      await _api.post('/api/leads/$id/notes', data: {'note': note});
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> uploadLeadDocument(int id, FormData formData) async {
    try {
      await _api.upload('/api/leads/$id/documents/upload', formData);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<List<Map<String, dynamic>>> getLeadDocuments(int id) async {
    try {
      final response = await _api.get('/api/leads/$id/documents');
      final data = response.data['data'] ?? response.data;
      if (data is List) {
        return data.map((e) => Map<String, dynamic>.from(e)).toList();
      }
      return [];
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<List<Map<String, dynamic>>> getCalendarLeads({
    String? from,
    String? to,
  }) async {
    try {
      final params = <String, dynamic>{};
      if (from != null) params['from'] = from;
      if (to != null) params['to'] = to;
      final response = await _api.get(
        '/api/calendar/leads',
        queryParameters: params,
      );
      final data = response.data['data'] ?? response.data;
      if (data is List) {
        return data.map((e) => Map<String, dynamic>.from(e)).toList();
      }
      return [];
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> importSolarQuotes() async {
    try {
      await _api.post('/api/integrations/solarquotes/fetch');
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> sendCustomerCredentials(int leadId) async {
    try {
      await _api.post('/api/leads/$leadId/send-customer-credentials');
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// POST /api/leads/import — upload CSV file
  Future<Map<String, dynamic>> importLeadsCsv(FormData formData) async {
    try {
      final response = await _api.upload('/api/leads/import', formData);
      return Map<String, dynamic>.from(response.data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// PATCH /api/leads/:id/schedule — schedule site inspection
  Future<void> scheduleInspection(int leadId, Map<String, dynamic> data) async {
    try {
      await _api.patch('/api/leads/$leadId/schedule', data: data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// GET /api/leads/:id/notes
  Future<List<Map<String, dynamic>>> getLeadNotes(int leadId) async {
    try {
      final response = await _api.get('/api/leads/$leadId/notes');
      final data = response.data['data'] ?? response.data;
      if (data is List) {
        return data.map((e) => Map<String, dynamic>.from(e)).toList();
      }
      return [];
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// GET /api/leads/count
  Future<Map<String, dynamic>> getLeadCount() async {
    try {
      final response = await _api.get('/api/leads/count');
      return Map<String, dynamic>.from(response.data['data'] ?? response.data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// GET /api/leads/dashboard
  Future<Map<String, dynamic>> getSalesDashboard() async {
    try {
      final response = await _api.get('/api/leads/dashboard');
      return Map<String, dynamic>.from(response.data['data'] ?? response.data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
