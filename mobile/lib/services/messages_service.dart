import 'package:dio/dio.dart';
import 'dart:io';
import '../core/network/api_client.dart';
import '../core/network/api_exceptions.dart';
import '../models/message.dart';

class MessagesService {
  final _api = ApiClient();

  String _basename(String path) => path.split(RegExp(r'[\\/]')).last;

  String _extensionFromName(String name) {
    final base = name.split(RegExp(r'[\\/]')).last;
    final dot = base.lastIndexOf('.');
    if (dot <= 0 || dot == base.length - 1) return '';
    return base.substring(dot).toLowerCase();
  }

  String _extensionFromMimeType(String? mimeType) {
    final m = (mimeType ?? '').toLowerCase().trim();
    if (m == 'application/pdf') return '.pdf';
    if (m == 'image/jpeg' || m == 'image/jpg') return '.jpg';
    if (m == 'image/png') return '.png';
    if (m == 'image/gif') return '.gif';
    if (m == 'image/webp') return '.webp';
    if (m == 'image/bmp') return '.bmp';
    if (m == 'image/heic') return '.heic';
    if (m == 'image/heif') return '.heif';
    return '';
  }

  String _filenameWithBestExtension({
    required File file,
    required String? name,
    required String? mimeType,
  }) {
    final pickedName = (name ?? _basename(file.path)).trim();
    final nameExt = _extensionFromName(pickedName);
    final pathExt = _extensionFromName(_basename(file.path));

    // If the picker name has no extension but the actual file path does, use the file path name.
    if (nameExt.isEmpty && pathExt.isNotEmpty) {
      return _basename(file.path);
    }

    // If still no extension, try mapping from MIME type.
    if (nameExt.isEmpty) {
      final mimeExt = _extensionFromMimeType(mimeType);
      if (mimeExt.isNotEmpty) {
        final stem = pickedName.endsWith(mimeExt) ? pickedName : pickedName;
        // Remove any trailing dots (rare) then append extension.
        final cleanedStem = stem.trim().replaceAll(RegExp(r'\.+$'), '');
        return '$cleanedStem$mimeExt';
      }
    }

    return pickedName;
  }

  Future<List<Participant>> getCompanyUsers(int? companyId) async {
    try {
      final path = companyId != null
          ? '/api/chats/company-users?companyId=$companyId'
          : '/api/chats/platform-users';
      final response = await _api.get(path);
      final data = response.data['data'] ?? response.data;
      if (data is List) {
        return data.map((e) => Participant.fromJson(e)).toList();
      }
      return [];
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<List<Conversation>> getConversations(
      {int? companyId, String? search}) async {
    try {
      final params = <String, dynamic>{};
      if (companyId != null) params['companyId'] = companyId;
      if (search != null && search.isNotEmpty) params['q'] = search;
      final response =
          await _api.get('/api/chats', queryParameters: params);
      final data = response.data['data'] ?? response.data;
      if (data is List) {
        return data.map((e) => Conversation.fromJson(e)).toList();
      }
      return [];
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<Conversation> createConversation({
    required String type,
    int? otherUserId,
    String? name,
    List<int>? userIds,
    int? companyId,
  }) async {
    try {
      final data = <String, dynamic>{'type': type};
      if (otherUserId != null) data['otherUserId'] = otherUserId;
      if (name != null) data['name'] = name;
      if (userIds != null) data['userIds'] = userIds;
      if (companyId != null) data['companyId'] = companyId;
      final response = await _api.post('/api/chats', data: data);
      return Conversation.fromJson(response.data['data'] ?? response.data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<Map<String, dynamic>> getMessages(int conversationId,
      {String? before, int? jump, int limit = 50, int? companyId}) async {
    try {
      final params = <String, dynamic>{'limit': limit};
      // Backend expects numeric message id for pagination, not ISO timestamps.
      if (before != null && before.isNotEmpty) params['before'] = before;
      if (jump != null) params['jump'] = jump;
      if (companyId != null) params['companyId'] = companyId;
      final response = await _api.get('/api/chats/$conversationId/messages',
          queryParameters: params);
      final root = response.data;
      if (root is! Map) {
        return {'messages': <ChatMessage>[], 'hasMore': false};
      }
      // API returns { success, data: [...messages], hasMore }
      final rawList = root['data'] ?? root['messages'];
      final messages = <ChatMessage>[];
      if (rawList is List) {
        for (final e in rawList) {
          if (e is Map) {
            messages.add(ChatMessage.fromJson(Map<String, dynamic>.from(e)));
          }
        }
      }
      return {
        'messages': messages,
        'hasMore': root['hasMore'] == true,
      };
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<ChatMessage> sendMessage(int conversationId, String body,
      {int? companyId}) async {
    try {
      final data = <String, dynamic>{'body': body};
      if (companyId != null) data['companyId'] = companyId;
      final response =
          await _api.post('/api/chats/$conversationId/messages', data: data);
      return ChatMessage.fromJson(response.data['data'] ?? response.data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<ChatMessage> sendAttachment(
    int conversationId,
    File file, {
    String? name,
    String? mimeType,
    int? companyId,
  }) async {
    try {
      final finalFilename = _filenameWithBestExtension(
        file: file,
        name: name,
        mimeType: mimeType,
      );
      final uploadForm = FormData.fromMap({
        'attachment': await MultipartFile.fromFile(
          file.path,
          filename: finalFilename,
        ),
      });
      final uploaded = await uploadAttachment(
        conversationId,
        uploadForm,
        companyId: companyId,
      );
      final response = await _api.post(
        '/api/chats/$conversationId/messages',
        data: {
          'body': '',
          'attachments': [
            {
              'filename': uploaded.filename,
              'mimetype': uploaded.mimetype ?? mimeType,
              'storageUrl': uploaded.storageUrl,
            },
          ],
          if (companyId != null) 'companyId': companyId,
        },
      );
      return ChatMessage.fromJson(response.data['data'] ?? response.data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<Attachment> uploadAttachment(
      int conversationId, FormData formData, {int? companyId}) async {
    try {
      final path = companyId != null
          ? '/api/chats/$conversationId/upload?companyId=$companyId'
          : '/api/chats/$conversationId/upload';
      final response = await _api.upload(path, formData);
      return Attachment.fromJson(response.data['data'] ?? response.data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> markAsRead(int conversationId, {int? companyId}) async {
    try {
      final data = <String, dynamic>{};
      if (companyId != null) data['companyId'] = companyId;
      await _api.patch('/api/chats/$conversationId/read', data: data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// POST /api/chats/:id/participants — add members to group
  Future<void> addGroupParticipants(
      int conversationId, List<int> userIds, {int? companyId}) async {
    try {
      final data = <String, dynamic>{'userIds': userIds};
      if (companyId != null) data['companyId'] = companyId;
      await _api.post('/api/chats/$conversationId/participants', data: data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// DELETE /api/chats/:id/participants/:userId — remove member from group
  Future<void> removeGroupParticipant(
      int conversationId, int userId, {int? companyId}) async {
    try {
      await _api.delete('/api/chats/$conversationId/participants/$userId');
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// GET /api/chats/:id/attachments — list all shared media/files
  Future<List<Attachment>> getConversationAttachments(
      int conversationId, {int? companyId}) async {
    try {
      final params = <String, dynamic>{};
      if (companyId != null) params['companyId'] = companyId;
      final response = await _api.get(
        '/api/chats/$conversationId/attachments',
        queryParameters: params,
      );
      final data = response.data['data'] ?? response.data;
      if (data is List) {
        return data.map((e) => Attachment.fromJson(e)).toList();
      }
      return [];
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// GET /api/chats/:id — get single conversation details
  Future<Conversation> getConversation(int conversationId,
      {int? companyId}) async {
    try {
      final params = <String, dynamic>{};
      if (companyId != null) params['companyId'] = companyId;
      final response = await _api.get(
        '/api/chats/$conversationId',
        queryParameters: params,
      );
      return Conversation.fromJson(response.data['data'] ?? response.data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}

