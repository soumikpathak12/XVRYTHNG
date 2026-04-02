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
  final DateTime? createdAt;
  final List<Attachment> attachments;

  ChatMessage({
    required this.id,
    this.body,
    this.senderName,
    this.senderId,
    this.isOwn = false,
    this.createdAt,
    this.attachments = const [],
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) => ChatMessage(
        id: json['id'] ?? 0,
        body: json['body'],
        senderName: json['senderName'] ?? json['sender_name'],
        senderId: json['senderId'] ?? json['sender_id'],
        isOwn: json['isOwn'] == true || json['is_own'] == true,
        createdAt: _parseDate(json['createdAt'] ?? json['created_at']),
        attachments: (json['attachments'] as List?)
                ?.map((a) => Attachment.fromJson(
                    Map<String, dynamic>.from(a as Map)))
                .toList() ??
            [],
      );

  static DateTime? _parseDate(dynamic v) {
    if (v == null) return null;
    if (v is DateTime) return v;
    return DateTime.tryParse(v.toString());
  }
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
      mimetype?.startsWith('image/') == true ||
      filename.toLowerCase().endsWith('.jpg') ||
      filename.toLowerCase().endsWith('.jpeg') ||
      filename.toLowerCase().endsWith('.png');
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
