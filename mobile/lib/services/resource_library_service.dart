import 'package:dio/dio.dart';
import '../core/network/api_client.dart';
import '../core/network/api_exceptions.dart';

class ResourceLibraryService {
  final _api = ApiClient();

  Future<List<Map<String, dynamic>>> listResources() async {
    try {
      final response = await _api.get('/api/resources');
      final data = response.data['data'];
      if (data is! List) return const [];
      return data
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<Map<String, dynamic>> createResource({
    required String title,
    required String category,
    required String sectionName,
    required String resourceType,
    String? imageUrl,
    String? linkUrl,
    String? notes,
  }) async {
    try {
      final response = await _api.post(
        '/api/resources',
        data: {
          'title': title,
          'category': category,
          'section_name': sectionName,
          'resource_type': resourceType,
          'image_url': imageUrl,
          'link_url': linkUrl,
          'notes': notes,
        },
      );
      final data = response.data['data'];
      if (data is Map) return Map<String, dynamic>.from(data);
      return {};
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<String> uploadPhoto(String filePath) async {
    try {
      final form = FormData.fromMap({
        'photo': await MultipartFile.fromFile(filePath),
      });
      final response = await _api.upload('/api/resources/upload-photo', form);
      final data = response.data['data'];
      if (data is Map && (data['image_url'] ?? '').toString().trim().isNotEmpty) {
        return data['image_url'].toString().trim();
      }
      throw Exception('Upload succeeded but no image URL returned');
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> deleteResource(int id) async {
    try {
      await _api.delete('/api/resources/$id');
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
