// src/components/projects/ProjectsCalendar.jsx
import React, { useMemo, useState, useCallback } from 'react';

/**
 * ProjectsCalendar — month view (Australia/Melbourne timezone)
 * Only projects with a valid getDate(project) will be shown in cells.
 */
const TZ = 'Australia/Melbourne';

export default function ProjectsCalendar({
  projects = [],
  getDate,                        
  titleForProject = (p) => p.customerName ?? `Project #${p.id}`,
  subtitleForProject = (p) => [p._raw?.suburb ?? p.address, p.stage].filter(Boolean).join(' • ') || '',
  onProjectClick,
  weekStartsOn = 1,           
  minMonth,
  maxMonth,
  style,
  className,
}) {
  if (typeof getDate !== 'function') {
    throw new Error('ProjectsCalendar: getDate prop is required and must be a function.');
  }

  const sysLocale = 'en-AU';

  // "today" key in Melbourne
  const todayKey = toKeyInTz(new Date(), TZ) ?? safeTodayKey();

  // Initial month = earliest scheduled day (if any), else today
  const initialMonthKey = useMemo(() => {
    const eventKeys = projects
      .map((p) => normalizeToKeyInTz(getDate(p), TZ))
      .filter(Boolean)
      .sort(); // YYYY-MM-DD lexicographically sorted
    const startKey = eventKeys[0] ?? todayKey;
    return keyStartOfMonth(startKey);
  }, [projects, getDate, todayKey]);

  const [viewMonthKey, setViewMonthKey] = useState(initialMonthKey);

  const canGoPrev = useMemo(() => {
    if (!minMonth) return true;
    const limit = keyStartOfMonth(toKeyInTz(minMonth, TZ) ?? safeTodayKey());
    const prev = keyAddMonths(viewMonthKey, -1);
    return prev >= limit;
  }, [minMonth, viewMonthKey]);

  const canGoNext = useMemo(() => {
    if (!maxMonth) return true;
    const limit = keyStartOfMonth(toKeyInTz(maxMonth, TZ) ?? safeTodayKey());
    const next = keyAddMonths(viewMonthKey, 1);
    return next <= limit;
  }, [maxMonth, viewMonthKey]);

  // Group projects by Melbourne day key
  const byDay = useMemo(() => {
    const map = new Map();
    for (const p of projects) {
      const k = normalizeToKeyInTz(getDate(p), TZ);
      if (!k) continue;
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(p);
    }
    // Sort each day's items for consistent display
    for (const [, arr] of map.entries()) {
      arr.sort((a, b) => {
        const ta = (titleForProject(a) ?? '').localeCompare(titleForProject(b) ?? '');
        if (ta !== 0) return ta;
        return String(a.id).localeCompare(String(b.id));
      });
    }
    return map;
  }, [projects, getDate, titleForProject]);

  // 6×7 grid keys
  const days = useMemo(() => {
    return buildMonthGridKeys(viewMonthKey, weekStartsOn).map((key) => ({
      key,
      outside: key.slice(0, 7) !== viewMonthKey.slice(0, 7),
      date: dateFromKeyAtNoonUTC(key),
    }));
  }, [viewMonthKey, weekStartsOn]);

  // Formatters
  const fmtMonth = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(sysLocale, { month: 'long', year: 'numeric', timeZone: TZ });
    return (monthKey) => {
      const midKey = monthKey && monthKey.length >= 8 ? monthKey.slice(0, 8) + '15' : null;
      const d = midKey ? dateFromKeyAtNoonUTC(midKey) : new Date(NaN);
      return fmt.format(d);
    };
  }, [sysLocale]);

  const fmtWeekday = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(sysLocale, { weekday: 'short', timeZone: TZ });
    return (d) => fmt.format(d);
  }, [sysLocale]);

  const weekdayLabels = useMemo(() => {
    const startKey = keyStartOfWeek(viewMonthKey, weekStartsOn);
    return Array.from({ length: 7 }, (_, i) => {
      const k = keyAddDays(startKey, i);
      return fmtWeekday(dateFromKeyAtNoonUTC(k));
    });
  }, [fmtWeekday, viewMonthKey, weekStartsOn]);

  // Nav handlers
  const goPrevMonth = useCallback(() => { if (canGoPrev) setViewMonthKey((k) => keyAddMonths(k, -1)); }, [canGoPrev]);
  const goNextMonth = useCallback(() => { if (canGoNext) setViewMonthKey((k) => keyAddMonths(k, 1)); }, [canGoNext]);
  const goToday = useCallback(() => setViewMonthKey(keyStartOfMonth(todayKey)), [todayKey]);

  return (
    <>
      <style>{`
/* ---- Root card ---- */
.pc-root {
  background: #fff;
  border: 1px solid #E5E7EB;
  border-radius: 14px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  padding: 12px;
  width: 100%;
  overflow: hidden;
}
/* ---- Header ---- */
.pc-header {
  display: grid;
  grid-template-columns: 40px 1fr 40px;
  align-items: center;
  padding: 6px 8px 4px;
}
.pc-chevron {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid #E5E7EB;
  background: #F9FAFB;
  color: #111827;
  font-weight: 800;
  cursor: pointer;
}
.pc-chevron:disabled { opacity: .5; cursor: not-allowed; }
.pc-chevron:hover:not(:disabled) { background:#F3F4F6; }
.pc-titleWrap { text-align: center; }
.pc-title {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  color: #0f1a2b;
  line-height: 1.1;
}
.pc-todayLink {
  margin-top: 2px;
  font-size: 11px;
  font-weight: 800;
  color: #2563EB;
  text-transform: uppercase;
  letter-spacing: .03em;
  cursor: pointer;
  background: transparent;
  border: none;
}
/* ---- Weekbar ---- */
.pc-weekbar {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border: 1px solid #E5E7EB;
  border-radius: 10px 10px 0 0;
  overflow: hidden;
}
.pc-weekday {
  padding: 10px 8px;
  text-align: left;
  font-size: 11px;
  font-weight: 800;
  color: #6B7280;
  text-transform: uppercase;
  border-right: 1px solid #E5E7EB;
}
.pc-weekday:last-child { border-right: none; }
/* ---- Grid ---- */
.pc-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-auto-rows: 110px;
  border-left: 1px solid #E5E7EB;
  border-right: 1px solid #E5E7EB;
  border-bottom: 1px solid #E5E7EB;
  border-radius: 0 0 10px 10px;
  overflow: hidden;
}
.pc-cell {
  position: relative;
  background: #fff;
  border-right: 1px solid #E5E7EB;
  border-bottom: 1px solid #E5E7EB;
  padding: 8px 8px 6px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.pc-cell:nth-child(7n) { border-right: none; }
/* Date number */
.pc-dateNum {
  font-weight: 800;
  color: #0f1a2b;
  font-size: 12px;
}
.pc-outside .pc-dateNum { color: #9CA3AF; }
/* Today outline */
.pc-today::after {
  content: '';
  position: absolute;
  inset: 4px;
  border: 2px solid rgba(37, 99, 235, 0.5);
  border-radius: 8px;
  pointer-events: none;
}
/* Project chips */
.pc-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  background: #FFFFFF;
  cursor: pointer;
}
.pc-chip:hover { background: #F9FAFB; }
.pc-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #0ea5a4; /* teal */
  flex: 0 0 auto;
}
.pc-chipTitle {
  font-weight: 700;
  color: #0f1a2b;
  font-size: 12px;
  line-height: 1.2;
}
.pc-chipSub {
  color: #6B7280;
  font-size: 11px;
}
.pc-more {
  font-size: 12px;
  color: #374151;
  padding-left: 2px;
}
@media (max-width: 900px) {
  .pc-grid { grid-auto-rows: 120px; }
}
      `}</style>

      <div className={`pc-root ${className ?? ''}`} style={style} role="region" aria-label="Projects calendar">
        {/* Header */}
        <div className="pc-header">
          <button type="button" className="pc-chevron" onClick={goPrevMonth} disabled={!canGoPrev} aria-label="Previous month">‹</button>
          <div className="pc-titleWrap">
            <h3 className="pc-title">{fmtMonth(viewMonthKey)}</h3>
            <button type="button" className="pc-todayLink" onClick={goToday}>GO TO TODAY</button>
          </div>
          <button type="button" className="pc-chevron" onClick={goNextMonth} disabled={!canGoNext} aria-label="Next month">›</button>
        </div>

        {/* Weekday header */}
        <div className="pc-weekbar" aria-hidden="true">
          {weekdayLabels.map((w, i) => (
            <div key={i} className="pc-weekday">{w.toUpperCase()}</div>
          ))}
        </div>

        {/* 6×7 grid */}
        <div className="pc-grid" role="grid" aria-label="Month grid">
          {days.map((d, idx) => {
            const items = byDay.get(d.key) ?? [];
            const isToday = d.key === todayKey;
            const visible = items.slice(0, 3);
            const overflow = items.length - visible.length;
            return (
              <div
                key={idx}
                className={`pc-cell ${isToday ? 'pc-today' : ''} ${d.outside ? 'pc-outside' : ''}`}
                role="gridcell"
                aria-label={d.date.toDateString()}
              >
                <div className="pc-dateNum">{d.date.getDate()}</div>

                {visible.map((project, i) => (
                  <div
                    key={project.id ?? i}
                    className="pc-chip"
                    onClick={() => onProjectClick?.(project)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && project?.id != null) {
                        e.preventDefault();
                        onProjectClick?.(project);
                      }
                    }}
                    title={subtitleForProject(project) || undefined}
                  >
                    <span className="pc-dot" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div className="pc-chipTitle">{titleForProject(project)}</div>
                      {subtitleForProject(project) ? (
                        <div className="pc-chipSub">{subtitleForProject(project)}</div>
                      ) : null}
                    </div>
                  </div>
                ))}

                {overflow > 0 && <div className="pc-more">+{overflow} more</div>}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

/* ==================== Timezone helpers (YYYY-MM-DD keys) ==================== */
function toKeyInTz(d, tz) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  return y && m && day ? `${y}-${m}-${day}` : null;
}
function safeTodayKey() {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
function normalizeToKeyInTz(v, tz) {
  if (!v) return null;
  if (typeof v === 'string' && !/\d{4}-\d{2}-\d{2}/.test(v)) return null;
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return toKeyInTz(d, tz);
}
function dateFromKeyAtNoonUTC(key /* YYYY-MM-DD */) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return new Date(NaN);
  return new Date(`${key}T12:00:00Z`);
}
function keyStartOfMonth(key) {
  if (!key || key.length < 10) return safeTodayKey().slice(0, 8) + '01';
  return key.slice(0, 8) + '01';
}
function keyAddMonths(key, n) {
  const y = parseInt(key.slice(0, 4), 10);
  const m = parseInt(key.slice(5, 7), 10);
  const base = new Date(Date.UTC(y, m - 1 + n, 1, 12, 0, 0));
  const yy = base.getUTCFullYear();
  const mm = String(base.getUTCMonth() + 1).padStart(2, '0');
  return `${yy}-${mm}-01`;
}
function keyWeekday(key, tz) {
  const d = dateFromKeyAtNoonUTC(key);
  const short = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: tz }).format(d);
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[short] ?? 0;
}
function keyStartOfWeek(monthKey, weekStartsOn) {
  const firstOfMonth = keyStartOfMonth(monthKey);
  const wd = keyWeekday(firstOfMonth, TZ);
  const offset = ((wd - weekStartsOn) + 7) % 7;
  return keyAddDays(firstOfMonth, -offset);
}
function keyAddDays(key, n) {
  const y = parseInt(key.slice(0, 4), 10);
  const m = parseInt(key.slice(5, 7), 10);
  const d = parseInt(key.slice(8, 10), 10);
  const base = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  base.setUTCDate(base.getUTCDate() + n);
  const yy = base.getUTCFullYear();
  const mm = String(base.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(base.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}
function buildMonthGridKeys(monthKey, weekStartsOn) {
  const firstVisible = keyStartOfWeek(monthKey, weekStartsOn);
  return Array.from({ length: 42 }, (_, i) => keyAddDays(firstVisible, i));
}