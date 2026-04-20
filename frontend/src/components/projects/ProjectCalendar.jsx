// src/components/projects/ProjectsCalendar.jsx
import React, { useMemo, useState, useCallback, useEffect } from 'react';

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

  // Always open on the **current calendar month** (Melbourne). Past schedules are reachable via ‹ ›.
  // (Opening on earliest event stranded users in March after April rollover.)
  const initialMonthKey = useMemo(() => keyStartOfMonth(todayKey), [todayKey]);

  const [viewMonthKey, setViewMonthKey] = useState(initialMonthKey);

  useEffect(() => {
    setViewMonthKey(initialMonthKey);
  }, [initialMonthKey]);

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

  /** Full list for a day — opened from "+N more" */
  const [dayModal, setDayModal] = useState(null); // { key, items, label }

  useEffect(() => {
    if (!dayModal) return;
    const onKey = (e) => { if (e.key === 'Escape') setDayModal(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [dayModal]);

  const openDayModal = useCallback((dayKey, items) => {
    const d = dateFromKeyAtNoonUTC(dayKey);
    const label = Number.isNaN(d.getTime())
      ? dayKey
      : new Intl.DateTimeFormat(sysLocale, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          timeZone: TZ,
        }).format(d);
    setDayModal({ key: dayKey, items, label });
  }, [sysLocale]);

  const MAX_CHIPS_INLINE = 2;

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
  grid-auto-rows: minmax(132px, auto);
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
  padding: 6px 6px 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 132px;
}
.pc-cell:nth-child(7n) { border-right: none; }
.pc-cellBody {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
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
/* Compact chips: fit more per cell; full detail in day modal */
.pc-chip--compact {
  padding: 5px 7px;
  gap: 5px;
  flex-shrink: 0;
}
.pc-chip--compact .pc-chipTitle {
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.pc-chip--compact .pc-chipSub {
  display: none;
}
.pc-moreBtn {
  flex-shrink: 0;
  width: 100%;
  margin-top: 2px;
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px dashed #CBD5E1;
  background: #F8FAFC;
  color: #146b6b;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  text-align: center;
  transition: background 0.12s, border-color 0.12s;
}
.pc-moreBtn:hover {
  background: #E6F4F1;
  border-color: #146b6b;
}
/* Day detail modal */
.pc-dayOverlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  box-sizing: border-box;
}
.pc-dayModal {
  width: 100%;
  max-width: 420px;
  max-height: min(80vh, 560px);
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
  border: 1px solid #E5E7EB;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.pc-dayModalHead {
  padding: 16px 18px 12px;
  border-bottom: 1px solid #F3F4F6;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.pc-dayModalTitle {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.25;
}
.pc-dayModalMeta {
  margin: 4px 0 0;
  font-size: 13px;
  color: #64748b;
  font-weight: 600;
}
.pc-dayModalClose {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 10px;
  background: #F3F4F6;
  color: #475569;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}
.pc-dayModalClose:hover { background: #E2E8F0; }
.pc-dayModalList {
  padding: 10px 12px 14px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.pc-dayModalRow {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  text-align: left;
  padding: 10px 12px;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  background: #fff;
  cursor: pointer;
  transition: border-color 0.12s, box-shadow 0.12s;
}
.pc-dayModalRow:hover {
  border-color: #146b6b;
  box-shadow: 0 2px 8px rgba(20,107,107,0.12);
}
.pc-dayModalRowTitle {
  font-weight: 700;
  font-size: 14px;
  color: #0f172a;
}
.pc-dayModalRowSub {
  font-size: 12px;
  color: #64748b;
  margin-top: 3px;
}
@media (max-width: 900px) {
  .pc-grid { grid-auto-rows: minmax(128px, auto); }
  .pc-cell { min-height: 128px; }
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
            const visible = items.slice(0, MAX_CHIPS_INLINE);
            const moreCount = items.length - visible.length;
            return (
              <div
                key={idx}
                className={`pc-cell ${isToday ? 'pc-today' : ''} ${d.outside ? 'pc-outside' : ''}`}
                role="gridcell"
                aria-label={d.date.toDateString()}
              >
                <div className="pc-dateNum">{dayNumInTz(d.key, TZ)}</div>

                <div className="pc-cellBody">
                  {visible.map((project, i) => (
                    <div
                      key={project.id ?? i}
                      className="pc-chip pc-chip--compact"
                      onClick={() => onProjectClick?.(project)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if ((e.key === 'Enter' || e.key === ' ') && project?.id != null) {
                          e.preventDefault();
                          onProjectClick?.(project);
                        }
                      }}
                      title={`${titleForProject(project)}${subtitleForProject(project) ? ` — ${subtitleForProject(project)}` : ''}`}
                    >
                      <span className="pc-dot" />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
                        <div className="pc-chipTitle">{titleForProject(project)}</div>
                        {subtitleForProject(project) ? (
                          <div className="pc-chipSub">{subtitleForProject(project)}</div>
                        ) : null}
                      </div>
                    </div>
                  ))}

                  {moreCount > 0 && (
                    <button
                      type="button"
                      className="pc-moreBtn"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDayModal(d.key, items);
                      }}
                    >
                      +{moreCount} more {moreCount === 1 ? 'job' : 'jobs'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {dayModal && (
          <div
            className="pc-dayOverlay"
            role="presentation"
            onClick={() => setDayModal(null)}
          >
            <div
              className="pc-dayModal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="pc-day-modal-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="pc-dayModalHead">
                <div>
                  <h4 id="pc-day-modal-title" className="pc-dayModalTitle">
                    Jobs this day
                  </h4>
                  <p className="pc-dayModalMeta">{dayModal.label}</p>
                </div>
                <button
                  type="button"
                  className="pc-dayModalClose"
                  aria-label="Close"
                  onClick={() => setDayModal(null)}
                >
                  ×
                </button>
              </div>
              <div className="pc-dayModalList">
                {dayModal.items.map((project, i) => (
                  <button
                    key={project.id ?? i}
                    type="button"
                    className="pc-dayModalRow"
                    onClick={() => {
                      onProjectClick?.(project);
                      setDayModal(null);
                    }}
                  >
                    <span className="pc-dot" style={{ marginTop: 4 }} />
                    <div style={{ minWidth: 0 }}>
                      <div className="pc-dayModalRowTitle">{titleForProject(project)}</div>
                      {subtitleForProject(project) ? (
                        <div className="pc-dayModalRowSub">{subtitleForProject(project)}</div>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
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
/** Calendar cell day number aligned with TZ (matches title month), not browser local midnight. */
function dayNumInTz(key, tz) {
  const d = dateFromKeyAtNoonUTC(key);
  if (Number.isNaN(d.getTime())) return '';
  const n = new Intl.DateTimeFormat('en-AU', { timeZone: tz, day: 'numeric' }).format(d);
  return n;
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