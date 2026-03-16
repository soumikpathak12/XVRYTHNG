/**
 * On-Field calendar: combined site inspections + installation jobs for the current employee.
 * Used by GET /api/on-field/calendar
 */
import db from '../config/db.js';

/**
 * Get calendar events (site inspections + installation jobs) for an employee in a date range.
 * @param {number} companyId
 * @param {number} employeeId - current user's employee id
 * @param {string} fromDate - YYYY-MM-DD
 * @param {string} toDate - YYYY-MM-DD
 * @returns {Promise<Array<{ id: string, type: 'site_inspection'|'installation', title: string, start: string, end?: string, lead_id?: number, job_id?: number, address?: string, customer_name?: string, status?: string, system_type?: string }>>}
 */
export async function getOnFieldCalendar(companyId, employeeId, fromDate, toDate) {
  if (!companyId || !employeeId || !/^\d{4}-\d{2}-\d{2}$/.test(fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
    return [];
  }

  const startDt = `${fromDate} 00:00:00`;
  const endNext = new Date(toDate + 'T23:59:59');
  endNext.setUTCDate(endNext.getUTCDate() + 1);
  const endNextStr = endNext.toISOString().slice(0, 10);
  const endDt = `${endNextStr} 23:59:59`;

  const events = [];

  // 1) Site inspections: lead_site_inspections where inspector_id = employeeId, scheduled_at in range (or fallback to lead.site_inspection_date)
  const [inspections] = await db.execute(
    `SELECT lsi.id AS inspection_id, lsi.lead_id, lsi.scheduled_at, lsi.status AS inspection_status,
            l.customer_name, l.suburb
     FROM lead_site_inspections lsi
     INNER JOIN leads l ON l.id = lsi.lead_id
     WHERE lsi.inspector_id = ?
       AND (
         (lsi.scheduled_at IS NOT NULL AND lsi.scheduled_at >= ? AND lsi.scheduled_at <= ?)
         OR (lsi.scheduled_at IS NULL AND l.site_inspection_date IS NOT NULL AND l.site_inspection_date >= ? AND l.site_inspection_date <= ?)
       )
     ORDER BY COALESCE(lsi.scheduled_at, CONCAT(l.site_inspection_date, ' 09:00:00')) ASC`,
    [Number(employeeId), startDt, endDt, fromDate, toDate]
  );

  for (const row of inspections) {
    const start = row.scheduled_at
      ? (row.scheduled_at instanceof Date ? row.scheduled_at : new Date(row.scheduled_at)).toISOString()
      : `${row.lead_id}-${fromDate}T09:00:00.000Z`;
    const address = [row.suburb].filter(Boolean).join(', ') || undefined;
    events.push({
      id: `inspection-${row.inspection_id}`,
      type: 'site_inspection',
      title: row.customer_name ? `Inspection: ${row.customer_name}` : `Site inspection #${row.lead_id}`,
      start,
      lead_id: row.lead_id,
      customer_name: row.customer_name || null,
      address: address || undefined,
      status: row.inspection_status || null,
    });
  }

  // 2) Installation jobs: jobs where this employee is assignee, scheduled_date in range
  const [jobs] = await db.execute(
    `SELECT ij.id, ij.customer_name, ij.address, ij.suburb, ij.scheduled_date, ij.scheduled_time,
            ij.status, ij.system_type
     FROM installation_jobs ij
     INNER JOIN installation_job_assignees ija ON ija.job_id = ij.id AND ija.employee_id = ?
     WHERE ij.company_id = ? AND ij.scheduled_date >= ? AND ij.scheduled_date <= ?
     ORDER BY ij.scheduled_date ASC, ij.scheduled_time ASC`,
    [Number(employeeId), Number(companyId), fromDate, toDate]
  );

  for (const row of jobs) {
    const dateStr = row.scheduled_date instanceof Date
      ? row.scheduled_date.toISOString().slice(0, 10)
      : String(row.scheduled_date).slice(0, 10);
    const timeStr = row.scheduled_time != null
      ? (typeof row.scheduled_time === 'string' ? row.scheduled_time : String(row.scheduled_time)).slice(0, 8)
      : '09:00:00';
    const start = `${dateStr}T${timeStr.replace(/^(\d{2}):(\d{2}).*/, '$1:$2:00')}.000Z`;
    const address = [row.address, row.suburb].filter(Boolean).join(', ') || undefined;
    events.push({
      id: `installation-${row.id}`,
      type: 'installation',
      title: row.customer_name ? `Install: ${row.customer_name}` : `Installation #${row.id}`,
      start,
      job_id: row.id,
      customer_name: row.customer_name || null,
      address: address || undefined,
      status: row.status || null,
      system_type: row.system_type || null,
    });
  }

  // Sort all by start
  events.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  return events;
}
