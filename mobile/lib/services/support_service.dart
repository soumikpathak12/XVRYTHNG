import 'package:dio/dio.dart';
import '../core/network/api_client.dart';
import '../core/network/api_exceptions.dart';
import '../models/support_ticket.dart';

class SupportService {
  final _api = ApiClient();

  Future<List<SupportTicket>> getTickets({String? status}) async {
    try {
      final params = <String, dynamic>{};
      if (status != null && status.isNotEmpty) params['status'] = status;
      final response = await _api.get('/api/admin/support-tickets',
          queryParameters: params);
      final data = response.data['data'] ?? response.data;
      if (data is List) {
        return data.map((e) => SupportTicket.fromJson(e)).toList();
      }
      return [];
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<SupportTicket> getTicket(int id) async {
    try {
      final response = await _api.get('/api/admin/support-tickets/$id');
      return SupportTicket.fromJson(
          response.data['data'] ?? response.data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> createTicket(Map<String, dynamic> data) async {
    try {
      await _api.post('/api/admin/support-tickets', data: data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> updateTicketStatus(int id, String status) async {
    try {
      await _api.patch('/api/admin/support-tickets/$id',
          data: {'status': status});
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> addReply(int ticketId, String body) async {
    try {
      await _api.post('/api/admin/support-tickets/$ticketId/replies',
          data: {'body': body});
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  // Customer support endpoints
  Future<List<SupportTicket>> getCustomerTickets() async {
    try {
      final response = await _api.get('/api/customer/support-tickets');
      final data = response.data['data'] ?? response.data;
      if (data is List) {
        return data.map((e) => SupportTicket.fromJson(e)).toList();
      }
      return [];
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> createCustomerTicket(Map<String, dynamic> data) async {
    try {
      await _api.post('/api/customer/support-tickets', data: data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> withdrawTicket(int id) async {
    try {
      await _api.post('/api/customer/support-tickets/$id/withdraw');
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
