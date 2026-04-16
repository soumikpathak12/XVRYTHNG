class MelbourneTime {
  static DateTime? parseServerTimestamp(dynamic raw) {
    if (raw == null) return null;
    if (raw is DateTime) return _toMelbourneWallClock(raw.toUtc());

    final value = raw.toString().trim();
    if (value.isEmpty) return null;

    final normalized = value.contains(' ') ? value.replaceFirst(' ', 'T') : value;
    final hasTimezone = RegExp(r'(Z|[+-]\d{2}:?\d{2})$').hasMatch(normalized);
    final candidate = hasTimezone ? normalized : '${normalized}Z';
    final parsedUtc = DateTime.tryParse(candidate)?.toUtc();
    if (parsedUtc == null) return null;
    return _toMelbourneWallClock(parsedUtc);
  }

  static DateTime now() => _toMelbourneWallClock(DateTime.now().toUtc());

  static DateTime _toMelbourneWallClock(DateTime utc) {
    final offsetHours = _melbourneOffsetHours(utc);
    final shifted = utc.add(Duration(hours: offsetHours));
    return DateTime(
      shifted.year,
      shifted.month,
      shifted.day,
      shifted.hour,
      shifted.minute,
      shifted.second,
      shifted.millisecond,
      shifted.microsecond,
    );
  }

  static int _melbourneOffsetHours(DateTime utc) {
    final currentUtc = utc.toUtc();
    final year = currentUtc.year;
    final startUtc = _melbourneDstStartUtc(year, currentUtc.month);
    final endUtc = _melbourneDstEndUtc(year, currentUtc.month);
    final inDst = !currentUtc.isBefore(startUtc) && currentUtc.isBefore(endUtc);
    return inDst ? 11 : 10;
  }

  static DateTime _melbourneDstStartUtc(int year, int month) {
    final startYear = month >= 10 ? year : year - 1;
    final firstSunday = _firstSundayOfMonth(startYear, 10);
    return DateTime.utc(firstSunday.year, firstSunday.month, firstSunday.day, 16);
  }

  static DateTime _melbourneDstEndUtc(int year, int month) {
    final endYear = month >= 10 ? year + 1 : year;
    final firstSunday = _firstSundayOfMonth(endYear, 4);
    return DateTime.utc(firstSunday.year, firstSunday.month, firstSunday.day, 16);
  }

  static DateTime _firstSundayOfMonth(int year, int month) {
    final firstDay = DateTime.utc(year, month, 1);
    final offset = (DateTime.sunday - firstDay.weekday) % 7;
    return firstDay.add(Duration(days: offset));
  }
}