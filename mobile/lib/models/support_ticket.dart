class SupportTicket {
  final int id;
  final String subject;
  final String? description;
  final String status;
  final String? priority;
  final String? category;
  final String? createdByName;
  final int? createdById;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final List<TicketReply> replies;

  SupportTicket({
    required this.id,
    required this.subject,
    this.description,
    this.status = 'open',
    this.priority,
    this.category,
    this.createdByName,
    this.createdById,
    this.createdAt,
    this.updatedAt,
    this.replies = const [],
  });

  factory SupportTicket.fromJson(Map<String, dynamic> json) => SupportTicket(
        id: json['id'] ?? 0,
        subject: json['subject'] ?? '',
        description: json['description'],
        status: json['status'] ?? 'open',
        priority: json['priority'],
        category: json['category'],
        createdByName: json['created_by_name'],
        createdById: json['created_by_id'],
        createdAt: json['created_at'] != null
            ? DateTime.tryParse(json['created_at'].toString())
            : null,
        updatedAt: json['updated_at'] != null
            ? DateTime.tryParse(json['updated_at'].toString())
            : null,
        replies: (json['replies'] as List?)
                ?.map((r) => TicketReply.fromJson(r))
                .toList() ??
            [],
      );

  static const Map<String, String> statusLabels = {
    'open': 'Open',
    'in_progress': 'In Progress',
    'resolved': 'Resolved',
    'closed': 'Closed',
    'withdrawn': 'Withdrawn',
  };
}

class TicketReply {
  final int id;
  final String body;
  final String? senderName;
  final int? senderId;
  final bool isStaff;
  final DateTime? createdAt;

  TicketReply({
    required this.id,
    required this.body,
    this.senderName,
    this.senderId,
    this.isStaff = false,
    this.createdAt,
  });

  factory TicketReply.fromJson(Map<String, dynamic> json) => TicketReply(
        id: json['id'] ?? 0,
        body: json['body'] ?? '',
        senderName: json['sender_name'],
        senderId: json['sender_id'],
        isStaff: json['is_staff'] == true,
        createdAt: json['created_at'] != null
            ? DateTime.tryParse(json['created_at'].toString())
            : null,
      );
}
