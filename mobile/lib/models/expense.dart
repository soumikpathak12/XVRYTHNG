class Expense {
  final int id;
  final String category;
  final double amount;
  final String? currency;
  final DateTime? expenseDate;
  final String? description;
  final String? receiptPath;
  final String? projectName;
  final int? projectId;
  final String status;
  final String? reviewerNote;
  final DateTime? createdAt;
  final String? employeeName;

  Expense({
    required this.id,
    required this.category,
    required this.amount,
    this.currency = 'AUD',
    this.expenseDate,
    this.description,
    this.receiptPath,
    this.projectName,
    this.projectId,
    this.status = 'pending',
    this.reviewerNote,
    this.createdAt,
    this.employeeName,
  });

  factory Expense.fromJson(Map<String, dynamic> json) => Expense(
        id: json['id'] ?? 0,
        category: json['category'] ?? '',
        amount: (json['amount'] ?? 0).toDouble(),
        currency: json['currency'] ?? 'AUD',
        expenseDate: json['expense_date'] != null
            ? DateTime.tryParse(json['expense_date'].toString())
            : null,
        description: json['description'],
        receiptPath: json['receipt_path'],
        projectName: json['project_name'],
        projectId: json['project_id'],
        status: json['status'] ?? 'pending',
        reviewerNote: json['reviewer_note'],
        createdAt: json['created_at'] != null
            ? DateTime.tryParse(json['created_at'].toString())
            : null,
        employeeName: json['employee_name'],
      );

  static const List<String> categories = [
    'travel',
    'accommodation',
    'meals',
    'equipment',
    'materials',
    'fuel',
    'parking',
    'tools',
    'other',
  ];

  static const Map<String, String> categoryLabels = {
    'travel': 'Travel',
    'accommodation': 'Accommodation',
    'meals': 'Meals',
    'equipment': 'Equipment',
    'materials': 'Materials',
    'fuel': 'Fuel',
    'parking': 'Parking',
    'tools': 'Tools',
    'other': 'Other',
  };
}
