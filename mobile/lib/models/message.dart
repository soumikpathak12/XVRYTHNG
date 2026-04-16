import '../utils/melbourne_time.dart';

class Conversation {
  final int id;
  final String? name;
  final String type;
  final ChatMessage? lastMessage;
  final int unreadCount;
  final DateTime? updatedAt;
  final List<Participant> participants;

  Conversation({
    required this.id,
    this.name,
    required this.type,
    this.lastMessage,
    this.unreadCount = 0,
    this.updatedAt,
    this.participants = const [],
  });

  String getDisplayName(int currentUserId) {
    if (name != null && name!.isNotEmpty) return name!;
    if (type == 'dm') {
      final other = participants.where((p) => p.userId != currentUserId);
      if (other.isNotEmpty) return other.first.name;
    }
    return 'Chat';
  }

  factory Conversation.fromJson(Map<String, dynamic> json) {
    return Conversation(
      id: json['id'] ?? 0,
      name: json['name'],
      type: json['type'] ?? 'dm',
      lastMessage: json['lastMessage'] != null
          ? ChatMessage.fromJson(json['lastMessage'])
          : null,
      unreadCount: json['unreadCount'] ?? 0,
      updatedAt: json['updatedAt'] != null
          ? DateTime.tryParse(json['updatedAt'].toString())
          : null,
      participants: (json['participants'] as List?)
              ?.map((p) => Participant.fromJson(p))
              .toList() ??
          [],
    );
  }
}

class ChatMessage {
  final int id;
  final String? body;
  final String? senderName;
  final int? senderId;
  final bool isOwn;
  final bool isSearchMatch;
  final DateTime? createdAt;
  final List<Attachment> attachments;

  ChatMessage({
    required this.id,
    this.body,
    this.senderName,
    this.senderId,
    this.isOwn = false,
    this.isSearchMatch = false,
    this.createdAt,
    this.attachments = const [],
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) => ChatMessage(
        id: json['id'] ?? 0,
        body: json['body'],
        senderName: json['senderName'] ?? json['sender_name'],
        senderId: json['senderId'] ?? json['sender_id'],
        isOwn: json['isOwn'] == true || json['is_own'] == true,
        isSearchMatch: json['isSearchMatch'] == true || json['is_search_match'] == true,
        createdAt: MelbourneTime.parseServerTimestamp(
          json['createdAt'] ?? json['created_at'],
        ),
        attachments: (json['attachments'] as List?)
                ?.map((a) => Attachment.fromJson(
                    Map<String, dynamic>.from(a as Map)))
                .toList() ??
            [],
      );
}

class Attachment {
  final int id;
  final String filename;
  final String? mimetype;
  final String? storageUrl;

  Attachment({
    required this.id,
    required this.filename,
    this.mimetype,
    this.storageUrl,
  });

  factory Attachment.fromJson(Map<String, dynamic> json) => Attachment(
        id: json['id'] ?? 0,
        filename: json['filename'] ?? '',
        mimetype: json['mimetype'],
        storageUrl: json['storageUrl'] ?? json['storage_url'],
      );

  bool get isImage =>
      (mimetype?.toLowerCase().startsWith('image/') == true) ||
      _lowerFile.endsWith('.jpg') ||
      _lowerFile.endsWith('.jpeg') ||
      _lowerFile.endsWith('.png') ||
      _lowerFile.endsWith('.gif') ||
      _lowerFile.endsWith('.webp') ||
      _lowerFile.endsWith('.bmp') ||
      _lowerFile.endsWith('.heic') ||
      _lowerFile.endsWith('.heif') ||
      _lowerStorage.endsWith('.jpg') ||
      _lowerStorage.endsWith('.jpeg') ||
      _lowerStorage.endsWith('.png') ||
      _lowerStorage.endsWith('.gif') ||
      _lowerStorage.endsWith('.webp') ||
      _lowerStorage.endsWith('.bmp') ||
      _lowerStorage.endsWith('.heic') ||
      _lowerStorage.endsWith('.heif');

  String get _lowerFile => filename.toLowerCase();
  String get _lowerStorage => (storageUrl ?? '').toLowerCase();
}

class Participant {
  final int userId;
  final String name;
  final String? email;
  final String? role;

  Participant({
    required this.userId,
    required this.name,
    this.email,
    this.role,
  });

  factory Participant.fromJson(Map<String, dynamic> json) => Participant(
        userId: json['userId'] ?? json['user_id'] ?? json['id'] ?? 0,
        name: json['name'] ?? '',
        email: json['email'],
        role: json['role'],
      );
}
