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
  /** @type {Set<string>} `projectId|YYYY-MM-DD` days already covered by an installation job row */
  const coveredProjectInstallDays = new Set();

  // 1) Site inspections: lead_site_inspections where inspector_id = employeeId, scheduled_at in range (or fallback to lead.site_inspection_date)
  const [inspections] = await db.execute(
    `SELECT
            lsi.id AS inspection_id,
            lsi.lead_id,
            DATE_FORMAT(lsi.scheduled_at, '%Y-%m-%dT%H:%i:%s') AS scheduled_at_local,
            DATE_FORMAT(l.site_inspection_date, '%Y-%m-%d') AS site_inspection_date_only,
            lsi.status AS inspection_status,
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
    // IMPORTANT: Don't use toISOString() here (it shifts to UTC and can move date back a day).
    // We return a timezone-less local datetime string so the browser renders the same wall-clock time.
    const start = row.scheduled_at_local
      ? `${row.scheduled_at_local}`
      : (row.site_inspection_date_only ? `${row.site_inspection_date_only}T09:00:00` : null);
    if (!start) continue;
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

  // 2) Installation jobs: same assignment rules as installationService.listJobs —
  //    direct job assignees, or project_assignees / retailer_project_assignees on linked projects.
  const empId = Number(employeeId);
  const [jobs] = await db.execute(
    `SELECT
            ij.id, ij.project_id, ij.retailer_project_id,
            ij.customer_name, ij.address, ij.suburb,
            DATE_FORMAT(ij.scheduled_date, '%Y-%m-%d') AS scheduled_date_only,
            TIME_FORMAT(ij.scheduled_time, '%H:%i:%s') AS scheduled_time_only,
            ij.status, ij.system_type
     FROM installation_jobs ij
     WHERE ij.company_id = ?
       AND ij.scheduled_date >= ? AND ij.scheduled_date <= ?
       AND (
         EXISTS (
           SELECT 1 FROM installation_job_assignees ija2
           WHERE ija2.job_id = ij.id AND ija2.company_id = ij.company_id AND ija2.employee_id = ?
         )
         OR (
           ij.project_id IS NOT NULL AND EXISTS (
             SELECT 1 FROM project_assignees pa
             WHERE pa.project_id = ij.project_id AND pa.company_id = ij.company_id AND pa.employee_id = ?
           )
         )
         OR (
           ij.retailer_project_id IS NOT NULL AND EXISTS (
             SELECT 1 FROM retailer_project_assignees rpa
             WHERE rpa.project_id = ij.retailer_project_id AND rpa.company_id = ij.company_id AND rpa.employee_id = ?
           )
         )
       )
     ORDER BY ij.scheduled_date ASC, ij.scheduled_time ASC`,
    [Number(companyId), fromDate, toDate, empId, empId, empId]
  );

  for (const row of jobs) {
    const dateStr = row.scheduled_date_only ? String(row.scheduled_date_only).slice(0, 10) : null;
    const timeStr = row.scheduled_time_only ? String(row.scheduled_time_only).slice(0, 8) : '09:00:00';
    const start = dateStr ? `${dateStr}T${timeStr}` : null;
    if (!start) continue;
    if (row.project_id != null && dateStr) {
      coveredProjectInstallDays.add(`${Number(row.project_id)}|${dateStr}`);
    }
    const address = [row.address, row.suburb].filter(Boolean).join(', ') || undefined;
    events.push({
      id: `installation-${row.id}`,
      type: 'installation',
      title: row.customer_name ? `Install: ${row.customer_name}` : `Installation #${row.id}`,
      start,
      job_id: row.id,
      project_id: row.project_id != null ? Number(row.project_id) : null,
      retailer_project_id: row.retailer_project_id != null ? Number(row.retailer_project_id) : null,
      customer_name: row.customer_name || null,
      address: address || undefined,
      status: row.status || null,
      system_type: row.system_type || null,
    });
  }

  // 3) Project schedule + assignees when no installation_jobs row exists for that project/day.
  //    saveScheduleAndAssignees only syncs jobs for certain stages; stages like `new` with a date
  //    left assignees in project_assignees without a job — still show on the on-field calendar.
  const [scheduleInstallRows] = await db.execute(
    `SELECT DISTINCT
            ps.project_id,
            DATE_FORMAT(ps.scheduled_at, '%Y-%m-%dT%H:%i:%s') AS start_local,
            ps.status AS schedule_status,
            COALESCE(p.customer_name, l.customer_name) AS customer_name,
            COALESCE(p.suburb, l.suburb) AS suburb
       FROM project_schedules ps
       INNER JOIN project_assignees pa
         ON pa.project_id = ps.project_id AND pa.company_id = ps.company_id AND pa.employee_id = ?
       INNER JOIN projects p ON p.id = ps.project_id
       INNER JOIN leads l ON l.id = p.lead_id
      WHERE ps.company_id = ?
        AND ps.scheduled_at IS NOT NULL
        AND ps.scheduled_at >= ? AND ps.scheduled_at <= ?
        AND ps.status IN (
          'new', 'scheduled', 'to_be_rescheduled',
          'installation_in_progress', 'installation_completed'
        )
      ORDER BY ps.scheduled_at ASC`,
    [empId, Number(companyId), startDt, endDt]
  );

  for (const row of scheduleInstallRows) {
    const start = row.start_local ? String(row.start_local) : null;
    if (!start) continue;
    const dateStr = start.slice(0, 10);
    const pid = Number(row.project_id);
    const dayKey = `${pid}|${dateStr}`;
    if (coveredProjectInstallDays.has(dayKey)) continue;
    coveredProjectInstallDays.add(dayKey);
    const address = [row.suburb].filter(Boolean).join(', ') || undefined;
    events.push({
      id: `installation-project-${pid}-${dateStr}`,
      type: 'installation',
      title: row.customer_name ? `Install: ${row.customer_name}` : `Project #${pid}`,
      start,
      job_id: null,
      project_id: pid,
      retailer_project_id: null,
      customer_name: row.customer_name || null,
      address: address || undefined,
      status: row.schedule_status || null,
      system_type: null,
    });
  }

  // Sort all by start
  events.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  return events;
}
