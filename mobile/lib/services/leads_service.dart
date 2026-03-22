import 'package:dio/dio.dart';
import '../core/network/api_client.dart';
import '../core/network/api_exceptions.dart';
import '../models/lead.dart';

class LeadsService {
  final _api = ApiClient();

  Future<List<Lead>> getLeads({String? search, String? stage}) async {
    try {
      final params = <String, dynamic>{};
      if (search != null && search.isNotEmpty) params['search'] = search;
      if (stage != null && stage.isNotEmpty) params['stage'] = stage;
      final response =
          await _api.get('/api/leads', queryParameters: params);
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

  Future<List<Map<String, dynamic>>> getCalendarLeads(
      {String? from, String? to}) async {
    try {
      final params = <String, dynamic>{};
      if (from != null) params['from'] = from;
      if (to != null) params['to'] = to;
      final response =
          await _api.get('/api/calendar/leads', queryParameters: params);
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
}
