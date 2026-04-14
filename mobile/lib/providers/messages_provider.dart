import 'dart:async';
import 'package:flutter/foundation.dart';
import '../models/message.dart';
import '../services/messages_service.dart';

class MessagesProvider extends ChangeNotifier {
  final MessagesService _service = MessagesService();

  List<Conversation> _conversations = [];
  List<ChatMessage> _messages = [];
  List<Participant> _users = [];
  int? _activeConversationId;
  bool _loading = false;
  bool _hasMore = false;
  Timer? _pollTimer;

  List<Conversation> get conversations => _conversations;
  List<ChatMessage> get messages => _messages;
  List<Participant> get users => _users;
  int? get activeConversationId => _activeConversationId;
  bool get loading => _loading;
  bool get hasMore => _hasMore;

  int get totalUnread =>
      _conversations.fold(0, (sum, c) => sum + c.unreadCount);

  Future<void> loadConversations({int? companyId, String? search}) async {
    _loading = true;
    notifyListeners();
    try {
      _conversations =
          await _service.getConversations(companyId: companyId, search: search);
    } catch (_) {}
    _loading = false;
    notifyListeners();
  }

  Future<void> loadUsers(int? companyId) async {
    try {
      _users = await _service.getCompanyUsers(companyId);
      notifyListeners();
    } catch (_) {}
  }

  Future<void> openConversation(int id, {int? companyId}) async {
    _activeConversationId = id;
    _messages = [];
    _loading = true;
    notifyListeners();
    try {
      final result = await _service.getMessages(id, companyId: companyId);
      // API returns chronological (oldest first); reverse list so index 0 = newest for reverse ListView.
      final list = List<ChatMessage>.from(result['messages'] as List<ChatMessage>);
      _messages = list.reversed.toList();
      _hasMore = result['hasMore'] as bool;
      await _service.markAsRead(id, companyId: companyId);
      // List endpoint omits current user from `participants`; load full roster for groups.
      Conversation? convMeta;
      for (final c in _conversations) {
        if (c.id == id) {
          convMeta = c;
          break;
        }
      }
      if (convMeta?.type == 'group') {
        await _refreshConversationParticipants(id, companyId: companyId);
      }
    } catch (_) {}
    _loading = false;
    notifyListeners();
  }

  Future<void> loadMoreMessages({int? companyId}) async {
    if (_messages.isEmpty || !_hasMore || _activeConversationId == null) return;
    try {
      // Backend paginates with message id (older than this id).
      final oldestId = _messages.last.id;
      if (oldestId <= 0) return;
      final result = await _service.getMessages(_activeConversationId!,
          before: oldestId.toString(), companyId: companyId);
      final older = List<ChatMessage>.from(
              result['messages'] as List<ChatMessage>)
          .reversed
          .toList();
      _messages = [..._messages, ...older];
      _hasMore = result['hasMore'] as bool;
      notifyListeners();
    } catch (_) {}
  }

  Future<void> sendMessage(String body, {int? companyId}) async {
    if (_activeConversationId == null) return;
    try {
      final msg = await _service.sendMessage(
          _activeConversationId!, body,
          companyId: companyId);
      _messages = [msg, ..._messages];
      notifyListeners();
    } catch (e) {
      rethrow;
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
      return await _service.createConversation(
        type: type,
        otherUserId: otherUserId,
        name: name,
        userIds: userIds,
        companyId: companyId,
      );
    } catch (e) {
      rethrow;
    }
  }

  /// Add users to a group chat (same API as web `addGroupParticipants`).
  Future<void> addGroupMembers(
    int conversationId,
    List<int> userIds, {
    int? companyId,
  }) async {
    if (userIds.isEmpty) return;
    await _service.addGroupParticipants(
      conversationId,
      userIds,
      companyId: companyId,
    );
    await loadConversations(companyId: companyId);
    await _refreshConversationParticipants(conversationId,
        companyId: companyId);
  }

  /// Merge full participant list from GET /api/chats/:id (list endpoint omits self).
  Future<void> _refreshConversationParticipants(
    int conversationId, {
    int? companyId,
  }) async {
    try {
      final fresh =
          await _service.getConversation(conversationId, companyId: companyId);
      final idx = _conversations.indexWhere((c) => c.id == conversationId);
      if (idx < 0) return;
      final prev = _conversations[idx];
      _conversations = List.from(_conversations);
      _conversations[idx] = Conversation(
        id: fresh.id,
        name: fresh.name ?? prev.name,
        type: fresh.type,
        lastMessage: prev.lastMessage,
        unreadCount: prev.unreadCount,
        updatedAt: prev.updatedAt,
        participants: fresh.participants,
      );
      notifyListeners();
    } catch (_) {}
  }

  void startPolling({int? companyId, Duration interval = const Duration(seconds: 30)}) {
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(interval, (_) {
      loadConversations(companyId: companyId);
      if (_activeConversationId != null) {
        _refreshActiveConversation(companyId: companyId);
      }
    });
  }

  Future<void> _refreshActiveConversation({int? companyId}) async {
    if (_activeConversationId == null) return;
    try {
      final result = await _service.getMessages(_activeConversationId!,
          companyId: companyId);
      final list = List<ChatMessage>.from(result['messages'] as List<ChatMessage>);
      _messages = list.reversed.toList();
      notifyListeners();
    } catch (_) {}
  }

  void stopPolling() {
    _pollTimer?.cancel();
    _pollTimer = null;
  }

  @override
  void dispose() {
    stopPolling();
    super.dispose();
  }
}
