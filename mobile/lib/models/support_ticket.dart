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
      id: _asInt((json['ticket'] as Map?)?['id'] ?? json['id']),
      subject: ((json['ticket'] as Map?)?['subject'] ?? json['subject'] ?? '')
        .toString(),
      description: ((json['ticket'] as Map?)?['description'] ?? json['description'])
        ?.toString(),
      status: ((json['ticket'] as Map?)?['status'] ?? json['status'] ?? 'open')
        .toString(),
      priority: ((json['ticket'] as Map?)?['priority'] ?? json['priority'])
        ?.toString(),
      category: ((json['ticket'] as Map?)?['category'] ?? json['category'])
        ?.toString(),
      createdByName: (((json['ticket'] as Map?)?['created_by_name'] ??
            (json['ticket'] as Map?)?['customer_name'] ??
            json['created_by_name'] ??
            json['customer_name'])
          ?.toString())
        ?.trim(),
      createdById: _asNullableInt(
        (json['ticket'] as Map?)?['created_by_id'] ?? json['created_by_id']),
      createdAt: _asDateTime(
        (json['ticket'] as Map?)?['created_at'] ?? json['created_at']),
      updatedAt: _asDateTime(
        (json['ticket'] as Map?)?['updated_at'] ?? json['updated_at']),
      replies: () {
        final ticketMap = (json['ticket'] as Map?)?.cast<String, dynamic>();
        final customerName = ((ticketMap?['customer_name'] ?? json['customer_name'])
            ?.toString())
          ?.trim();
        final rawReplies = (json['replies'] as List?) ??
          (ticketMap?['replies'] as List?) ??
          const [];
        return rawReplies
          .whereType<Map>()
          .map((r) => TicketReply.fromJson(r.cast<String, dynamic>()))
          .map((reply) {
        if (!reply.isStaff && (reply.senderName == null || reply.senderName!.trim().isEmpty)) {
          return reply.copyWith(senderName: customerName?.isEmpty == true ? null : customerName);
        }
        return reply;
        }).toList();
      }(),
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

  TicketReply copyWith({
    String? senderName,
  }) {
    return TicketReply(
      id: id,
      body: body,
      senderName: senderName ?? this.senderName,
      senderId: senderId,
      isStaff: isStaff,
      createdAt: createdAt,
    );
  }

  factory TicketReply.fromJson(Map<String, dynamic> json) => TicketReply(
        id: _asInt(json['id']),
        body: (json['body'] ?? '').toString(),
        senderName: (json['sender_name'] ?? json['author_user_name'])?.toString(),
        senderId: _asNullableInt(
            json['sender_id'] ?? json['author_user_id'] ?? json['author_lead_id']),
        isStaff: json['is_staff'] == true ||
            (json['author_type']?.toString().toLowerCase() == 'staff'),
        createdAt: _asDateTime(json['created_at']),
      );
}

int _asInt(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '') ?? 0;
}

int? _asNullableInt(dynamic value) {
  if (value == null) return null;
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value.toString());
}

DateTime? _asDateTime(dynamic value) {
  if (value == null) return null;
  return DateTime.tryParse(value.toString());
}
