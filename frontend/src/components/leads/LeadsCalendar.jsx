import React, { useMemo, useState, useCallback } from 'react';
import CalendarLeadEntry from './CalendarLeadEntry.jsx';
import { getAppBaseFromPathname } from '../../utils/routeBase.js';

/**
 * LeadsCalendar (read-only month view) — “table” style
 * Timezone: Australia/Melbourne (AEST/AEDT)
 *
 * All grouping, grid math (month/weeks), and "today" are computed in AUS Melbourne time.
 * We avoid relying on system local time to be robust across users in different timezones.
 */

const TZ = 'Australia/Melbourne';

/* =========================
 *  Calendar Component
 * ========================= */
export default function LeadsCalendar({
  leads = [],
  getDate,
  titleForLead = (l) => l.customerName || `Lead #${l.id}`,
  subtitleForLead = (l) => l.suburb || l.stage || '',
  onLeadClick,
  weekStartsOn = 1, // 0=Sun, 1=Mon
  locale, // ignored to force English per request
  minMonth,
  maxMonth,
  style,
  className,
  viewMode = 'month', // 'day' | 'week' | 'month'
}) {
  const defaultLeadBase = useMemo(
    () => getAppBaseFromPathname(window.location.pathname),
    []
  );

  if (typeof getDate !== 'function') {
    throw new Error('LeadsCalendar: getDate prop is required and must be a function.');
  }

  // Force English month/weekday labels (Australian English).
  const sysLocale = 'en-AU';

  // "Today" (Melbourne) as YYYY-MM-DD key
  const todayKey = toKeyInTz(new Date(), TZ) || safeTodayKey();

  // Open on **today’s** month/week (Melbourne), not the earliest scheduled lead — avoids stuck on March in April.
  const [viewFocusKey, setViewFocusKey] = useState(() => toKeyInTz(new Date(), TZ) || safeTodayKey());
  const viewMonthKey = keyStartOfMonth(viewFocusKey);

  const canGoPrev = useMemo(() => {
    if (!minMonth) return true;
    const limit = toKeyInTz(minMonth, TZ) || safeTodayKey();
    if (viewMode === 'month') return keyAddMonths(viewMonthKey, -1) >= keyStartOfMonth(limit);
    if (viewMode === 'week') return keyAddDays(viewFocusKey, -7) >= limit;
    return keyAddDays(viewFocusKey, -1) >= limit;
  }, [minMonth, viewMode, viewMonthKey, viewFocusKey]);

  const canGoNext = useMemo(() => {
    if (!maxMonth) return true;
    const limit = toKeyInTz(maxMonth, TZ) || safeTodayKey();
    if (viewMode === 'month') return keyAddMonths(viewMonthKey, 1) <= keyStartOfMonth(limit);
    if (viewMode === 'week') return keyAddDays(viewFocusKey, 7) <= limit;
    return keyAddDays(viewFocusKey, 1) <= limit;
  }, [maxMonth, viewMode, viewMonthKey, viewFocusKey]);

  // Group leads by Melbourne day key
  const byDay = useMemo(() => {
    const map = new Map();
    for (const lead of leads) {
      const k = normalizeToKeyInTz(getDate(lead), TZ);
      if (!k) continue;
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(lead);
    }
    // Sort each day’s leads for consistent display
    for (const [, arr] of map.entries()) {
      arr.sort((a, b) => {
        const ta = (titleForLead(a) || '').localeCompare(titleForLead(b) || '');
        if (ta !== 0) return ta;
        return String(a.id).localeCompare(String(b.id));
      });
    }
    return map;
  }, [leads, getDate, titleForLead]);

  // Grid: month 6×7, week 1×7, day 1×1
  const days = useMemo(() => {
    if (viewMode === 'day') {
      return [{ key: viewFocusKey, outside: false, date: dateFromKeyAtNoonUTC(viewFocusKey) }];
    }
    if (viewMode === 'week') {
      const startKey = keyStartOfWeekContaining(viewFocusKey, weekStartsOn);
      return Array.from({ length: 7 }, (_, i) => {
        const key = keyAddDays(startKey, i);
        return { key, outside: false, date: dateFromKeyAtNoonUTC(key) };
      });
    }
    return buildMonthGridKeys(viewMonthKey, weekStartsOn).map((key) => ({
      key,
      outside: key.slice(0, 7) !== viewMonthKey.slice(0, 7),
      date: dateFromKeyAtNoonUTC(key),
    }));
  }, [viewMode, viewFocusKey, viewMonthKey, weekStartsOn]);

  // Formatters (in Melbourne)
  const fmtMonth = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(sysLocale, {
      month: 'long',
      year: 'numeric',
      timeZone: TZ,
    });
    // Accepts YYYY-MM-01; we format a mid-month date for safety
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
    const startKey = viewMode === 'week'
      ? keyStartOfWeekContaining(viewFocusKey, weekStartsOn)
      : keyStartOfWeek(viewMonthKey, weekStartsOn);
    return Array.from({ length: 7 }, (_, i) => {
      const k = keyAddDays(startKey, i);
      return fmtWeekday(dateFromKeyAtNoonUTC(k));
    });
  }, [fmtWeekday, viewMode, viewFocusKey, viewMonthKey, weekStartsOn]);

  const fmtDateLong = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(sysLocale, {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ,
    });
    return (d) => fmt.format(d);
  }, [sysLocale]);

  const headerTitle = useMemo(() => {
    if (viewMode === 'day') return fmtDateLong(dateFromKeyAtNoonUTC(viewFocusKey));
    if (viewMode === 'week') {
      const startKey = keyStartOfWeekContaining(viewFocusKey, weekStartsOn);
      const endKey = keyAddDays(startKey, 6);
      const fmtShort = new Intl.DateTimeFormat(sysLocale, {
        weekday: 'short', day: 'numeric', month: 'short', timeZone: TZ,
      });
      return `Week of ${fmtShort.format(dateFromKeyAtNoonUTC(startKey))} – ${fmtShort.format(dateFromKeyAtNoonUTC(endKey))}`;
    }
    return fmtMonth(viewMonthKey);
  }, [viewMode, viewFocusKey, viewMonthKey, weekStartsOn, fmtMonth, fmtDateLong, sysLocale]);

  const goPrev = useCallback(() => {
    if (!canGoPrev) return;
    if (viewMode === 'month') setViewFocusKey((k) => keyAddDays(keyAddMonths(keyStartOfMonth(k), -1), 14));
    else if (viewMode === 'week') setViewFocusKey((k) => keyAddDays(k, -7));
    else setViewFocusKey((k) => keyAddDays(k, -1));
  }, [canGoPrev, viewMode]);

  const goNext = useCallback(() => {
    if (!canGoNext) return;
    if (viewMode === 'month') setViewFocusKey((k) => keyAddDays(keyAddMonths(keyStartOfMonth(k), 1), 14));
    else if (viewMode === 'week') setViewFocusKey((k) => keyAddDays(k, 7));
    else setViewFocusKey((k) => keyAddDays(k, 1));
  }, [canGoNext, viewMode]);

  const goToday = useCallback(() => setViewFocusKey(todayKey), [todayKey]);

  return (
    <>
      <style>{`
        /* ---- Root card ---- */
        .lc2-root {
          background: #fff;
          border: 1px solid #E5E7EB;
          border-radius: 14px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          padding: 12px;
          width: 100%;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .lc2-compactMonth .lc2-chip {
          padding: 4px 6px;
          border-radius: 7px;
        }
        .lc2-compactMonth .lc2-chipTitle { font-size: 11px; }
        .lc2-compactMonth .lc2-chipSub { font-size: 10px; }

        /* ---- Header ---- */
        .lc2-header {
          display: grid;
          grid-template-columns: 40px 1fr 40px;
          align-items: center;
          padding: 6px 8px 4px;
        }
        .lc2-chevron {
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
        .lc2-chevron:disabled { opacity: .5; cursor: not-allowed; }
        .lc2-chevron:hover:not(:disabled) { background:#F3F4F6; }
        .lc2-titleWrap { text-align: center; }
        .lc2-title {
          margin: 0;
          font-size: 18px;
          font-weight: 800;
          color: #0f1a2b;
          line-height: 1.1;
        }
        .lc2-todayLink {
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

        /* ---- Table header (weekdays) ---- */
        .lc2-weekbar {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          border-top: 1px solid #E5E7EB;
          border-bottom: 1px solid #E5E7EB;
          border-left: 1px solid #E5E7EB;
          border-right: 1px solid #E5E7EB;
          border-radius: 10px 10px 0 0;
          overflow: hidden;
        }
        .lc2-weekday {
          padding: 10px 8px;
          text-align: left;
          font-size: 11px;
          font-weight: 800;
          color: #6B7280;
          text-transform: uppercase;
          border-right: 1px solid #E5E7EB;
        }
        .lc2-weekday:last-child { border-right: none; }

        /* ---- Grid (6 rows × 7 cols) ---- */
        .lc2-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          grid-auto-rows: 150px;
          border-left: 1px solid #E5E7EB;
          border-right: 1px solid #E5E7EB;
          border-bottom: 1px solid #E5E7EB;
          border-radius: 0 0 10px 10px;
          overflow: hidden;
          flex: 1;
          min-height: 0;
        }

        .lc2-cell {
          position: relative;
          background: #fff;
          border-right: 1px solid #E5E7EB;
          border-bottom: 1px solid #E5E7EB;
          padding: 8px 8px 6px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .lc2-events {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-height: 0;
          flex: 1;
          overflow: auto;
          padding-right: 2px; /* space for scrollbar */
        }
        .lc2-events::-webkit-scrollbar { width: 6px; }
        .lc2-events::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 6px; }
        .lc2-events::-webkit-scrollbar-track { background: transparent; }

        .lc2-cell:nth-child(7n) { border-right: none; } /* last in row */

        /* Date number (top-left) */
        .lc2-dateNum {
          font-weight: 800;
          color: #0f1a2b;
          font-size: 12px;
        }
        .lc2-outside .lc2-dateNum { color: #9CA3AF; }

        /* Today highlight (Melbourne): thin blue outline */
        .lc2-today::after {
          content: '';
          position: absolute;
          inset: 4px;
          border: 2px solid rgba(37, 99, 235, 0.5);
          border-radius: 8px;
          pointer-events: none;
        }

        /* Lead chips — neutral (no green) */
        .lc2-chip {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 8px;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          background: #FFFFFF;
          cursor: default;
        }
        .lc2-chip:hover { background: #F9FAFB; }
        .lc2-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #9CA3AF;
          flex: 0 0 auto;
        }
        .lc2-chipTitle {
          font-weight: 700;
          color: #0f1a2b;
          font-size: 12px;
          line-height: 1.2;
        }
        .lc2-chipSub {
          color: #6B7280;
          font-size: 11px;
        }
        .lc2-more {
          font-size: 12px;
          color: #374151;
          padding-left: 2px;
        }

        @media (max-width: 900px) {
          .lc2-grid { grid-auto-rows: 120px; }
        }
      `}</style>

      <div
        className={`lc2-root ${viewMode === 'month' ? 'lc2-compactMonth' : ''} ${className || ''}`}
        style={{
          ...(style || {}),
          ...(viewMode === 'month' ? {} : { height: '100%' }),
        }}
        role="region"
        aria-label="Leads calendar"
      >
        {/* Header */}
        <div className="lc2-header">
          <button
            type="button"
            className="lc2-chevron"
            onClick={goPrev}
            disabled={!canGoPrev}
            aria-label={viewMode === 'month' ? 'Previous month' : viewMode === 'week' ? 'Previous week' : 'Previous day'}
          >
            ‹
          </button>

          <div className="lc2-titleWrap">
            <h3 className="lc2-title">{headerTitle}</h3>
            <button type="button" className="lc2-todayLink" onClick={goToday}>
              GO TO TODAY
            </button>
          </div>

          <button
            type="button"
            className="lc2-chevron"
            onClick={goNext}
            disabled={!canGoNext}
            aria-label={viewMode === 'month' ? 'Next month' : viewMode === 'week' ? 'Next week' : 'Next day'}
          >
            ›
          </button>
        </div>

        {/* Weekday header row (hide for day view) */}
        {viewMode !== 'day' && (
          <div className="lc2-weekbar" aria-hidden="true">
            {weekdayLabels.map((w, i) => (
              <div key={i} className="lc2-weekday">{w.toUpperCase()}</div>
            ))}
          </div>
        )}

        {/* Grid: 1 col (day), 7 cols (week/month) */}
        <div
          className="lc2-grid"
          role="grid"
          aria-label={viewMode === 'day' ? 'Day' : viewMode === 'week' ? 'Week' : 'Month'}
          style={{
            gridTemplateColumns: `repeat(${viewMode === 'day' ? 1 : 7}, 1fr)`,
            ...(viewMode === 'day'
              ? { gridAutoRows: '1fr', height: '100%' }
              : viewMode === 'week'
              ? { gridAutoRows: '1fr', height: '100%' }
              : {}),
          }}
        >
          {days.map((d, idx) => {
            const items = byDay.get(d.key) || [];
            const isToday = d.key === todayKey;
            const maxVisible = viewMode === 'month' ? 8 : 50;
            const visible = items.slice(0, maxVisible);
            const overflow = items.length - visible.length;

            return (
              <div
                key={idx}
                className={`lc2-cell ${isToday ? 'lc2-today' : ''} ${d.outside ? 'lc2-outside' : ''}`}
                role="gridcell"
                aria-label={d.date.toDateString()}
              >
                <div className="lc2-dateNum">{dayNumInTz(d.key, TZ)}</div>

                <div className="lc2-events">
                  {visible.map((lead, i) => (
                    <CalendarLeadEntry
                      key={lead.id ?? i}
                      lead={lead}
                      title={titleForLead(lead)}
                      subtitle={subtitleForLead(lead) || undefined}
                      onClick={() => {
                        if (typeof onLeadClick === 'function') {
                          onLeadClick(lead);
                        } else if (lead?.id != null) {
                          window.location.assign(`${defaultLeadBase}/leads/${lead.id}/site-inspection`);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if ((e.key === 'Enter' || e.key === ' ') && lead?.id != null) {
                          e.preventDefault();
                          if (typeof onLeadClick === 'function') onLeadClick(lead);
                          else window.location.assign(`${defaultLeadBase}/leads/${lead.id}/site-inspection`);
                        }
                      }}
                    />
                  ))}

                  {overflow > 0 && <div className="lc2-more">+{overflow} more</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

/* =====================================================================
 *                         Timezone Utilities
 *   (all "key" functions operate on 'YYYY-MM-DD' strings in TZ)
 * ===================================================================== */


function toKeyInTz(d, tz) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
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

function dayNumInTz(key, tz) {
  const d = dateFromKeyAtNoonUTC(key);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-AU', { timeZone: tz, day: 'numeric' }).format(d);
}

/** Start of month key for a given key. */
function keyStartOfMonth(key) {
  if (!key || key.length < 10) return safeTodayKey().slice(0, 8) + '01';
  return key.slice(0, 8) + '01';
}

/** Add n months to a YYYY-MM-DD key (keeps day=01, safe for month headings). */
function keyAddMonths(key, n) {
  const y = parseInt(key.slice(0, 4), 10);
  const m = parseInt(key.slice(5, 7), 10);
  // move to first of month first to avoid overflow
  const base = new Date(Date.UTC(y, m - 1 + n, 1, 12, 0, 0));
  const yy = base.getUTCFullYear();
  const mm = String(base.getUTCMonth() + 1).padStart(2, '0');
  return `${yy}-${mm}-01`;
}

/** Weekday (0-6, Sun-Sat) for a key in TZ. */
function keyWeekday(key, tz) {
  const d = dateFromKeyAtNoonUTC(key);
  const short = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: tz }).format(d);
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[short] ?? 0;
}

/** Start-of-week key for a month key (aligns to weekStartsOn). Used for month grid. */
function keyStartOfWeek(monthKey, weekStartsOn) {
  const firstOfMonth = keyStartOfMonth(monthKey);
  const wd = keyWeekday(firstOfMonth, TZ);
  const offset = ((wd - weekStartsOn) + 7) % 7;
  return keyAddDays(firstOfMonth, -offset);
}

/** Start of week that contains the given day key (for week view navigation). */
function keyStartOfWeekContaining(key, weekStartsOn) {
  const wd = keyWeekday(key, TZ);
  const offset = ((wd - weekStartsOn) + 7) % 7;
  return keyAddDays(key, -offset);
}

/** Add n days to a YYYY-MM-DD key using calendar arithmetic (handles month/year rollover). */
function keyAddDays(key, n) {
  const y = parseInt(key.slice(0, 4), 10);
  const m = parseInt(key.slice(5, 7), 10);
  const d = parseInt(key.slice(8, 10), 10);
  // Construct at UTC noon to avoid DST-related local ambiguities
  const base = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  base.setUTCDate(base.getUTCDate() + n);
  const yy = base.getUTCFullYear();
  const mm = String(base.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(base.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** Build 42 sequential keys for a month view in TZ. */
function buildMonthGridKeys(monthKey, weekStartsOn) {
  const firstVisible = keyStartOfWeek(monthKey, weekStartsOn);
  return Array.from({ length: 42 }, (_, i) => keyAddDays(firstVisible, i));
}