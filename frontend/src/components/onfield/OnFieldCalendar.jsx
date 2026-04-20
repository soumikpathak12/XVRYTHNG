/**
 * On-Field Calendar: month/week/day views, colour-coded by job type (site_inspection vs installation).
 * Click entry opens inspection or installation form.
 */
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

const TZ = 'Australia/Melbourne';

const JOB_TYPE_COLORS = {
  site_inspection: { bg: '#ECFDF5', border: '#059669', dot: '#059669', label: 'Site inspection' },
  installation: { bg: '#EFF6FF', border: '#2563EB', dot: '#2563EB', label: 'Installation' },
};

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

function dateFromKeyAtNoonUTC(key) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return new Date(NaN);
  return new Date(`${key}T12:00:00Z`);
}

function dayNumInTz(key, tz) {
  const d = dateFromKeyAtNoonUTC(key);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-AU', { timeZone: tz, day: 'numeric' }).format(d);
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

function keyStartOfWeekContaining(key, weekStartsOn) {
  const wd = keyWeekday(key, TZ);
  const offset = ((wd - weekStartsOn) + 7) % 7;
  return keyAddDays(key, -offset);
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

function getEventDayKey(ev) {
  if (!ev?.start) return null;
  const s = typeof ev.start === 'string' ? ev.start : ev.start.toISOString?.();
  return s ? s.slice(0, 10) : null;
}

function getEventTimeLabel(ev) {
  if (!ev?.start) return '';
  const d = typeof ev.start === 'string' ? new Date(ev.start) : ev.start;
  return format(d, 'HH:mm');
}

/** Month/week cells: show at most this many chips; remainder behind "View N more". */
const MAX_GRID_EVENTS = 2;

export default function OnFieldCalendar({
  events = [],
  viewMode = 'month',
  weekStartsOn = 1,
  onEventClick,
  /** When set (e.g. after "View more"), scroll/focus this YYYY-MM-DD in day view */
  focusDayKey = null,
  onFocusDayConsumed,
  /** User clicked "View N more" — parent should switch to day view and set focusDayKey */
  onViewMoreDay,
}) {
  const navigate = useNavigate();
  const todayKey = toKeyInTz(new Date(), TZ) || safeTodayKey();
  const [viewFocusKey, setViewFocusKey] = useState(todayKey);
  const viewMonthKey = keyStartOfMonth(viewFocusKey);

  useEffect(() => {
    if (focusDayKey && /^\d{4}-\d{2}-\d{2}$/.test(focusDayKey)) {
      setViewFocusKey(focusDayKey);
      onFocusDayConsumed?.();
    }
  }, [focusDayKey, onFocusDayConsumed]);

  const byDay = useMemo(() => {
    const map = new Map();
    for (const ev of events) {
      const k = getEventDayKey(ev);
      if (!k) continue;
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(ev);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
    }
    return map;
  }, [events]);

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

  const sysLocale = 'en-AU';
  const fmtMonth = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(sysLocale, {
      month: 'long',
      year: 'numeric',
      timeZone: TZ,
    });
    return (monthKey) => {
      const midKey = monthKey?.slice(0, 8) + '15';
      return fmt.format(dateFromKeyAtNoonUTC(midKey));
    };
  }, []);

  const fmtWeekday = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(sysLocale, { weekday: 'short', timeZone: TZ });
    return (d) => fmt.format(d);
  }, []);

  const weekdayLabels = useMemo(() => {
    const startKey =
      viewMode === 'week'
        ? keyStartOfWeekContaining(viewFocusKey, weekStartsOn)
        : keyStartOfWeek(viewMonthKey, weekStartsOn);
    return Array.from({ length: 7 }, (_, i) =>
      fmtWeekday(dateFromKeyAtNoonUTC(keyAddDays(startKey, i)))
    );
  }, [viewMode, viewFocusKey, viewMonthKey, weekStartsOn, fmtWeekday]);

  const fmtDateLong = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(sysLocale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: TZ,
    });
    return (d) => fmt.format(d);
  }, []);

  const headerTitle = useMemo(() => {
    if (viewMode === 'day') return fmtDateLong(dateFromKeyAtNoonUTC(viewFocusKey));
    if (viewMode === 'week') {
      const startKey = keyStartOfWeekContaining(viewFocusKey, weekStartsOn);
      const endKey = keyAddDays(startKey, 6);
      const fmtShort = new Intl.DateTimeFormat(sysLocale, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        timeZone: TZ,
      });
      return `Week of ${fmtShort.format(dateFromKeyAtNoonUTC(startKey))} – ${fmtShort.format(dateFromKeyAtNoonUTC(endKey))}`;
    }
    return fmtMonth(viewMonthKey);
  }, [viewMode, viewFocusKey, viewMonthKey, fmtMonth, fmtDateLong]);

  const goPrev = useCallback(() => {
    if (viewMode === 'month')
      setViewFocusKey((k) => keyAddDays(keyAddMonths(keyStartOfMonth(k), -1), 14));
    else if (viewMode === 'week') setViewFocusKey((k) => keyAddDays(k, -7));
    else setViewFocusKey((k) => keyAddDays(k, -1));
  }, [viewMode]);

  const goNext = useCallback(() => {
    if (viewMode === 'month')
      setViewFocusKey((k) => keyAddDays(keyAddMonths(keyStartOfMonth(k), 1), 14));
    else if (viewMode === 'week') setViewFocusKey((k) => keyAddDays(k, 7));
    else setViewFocusKey((k) => keyAddDays(k, 1));
  }, [viewMode]);

  const goToday = useCallback(() => setViewFocusKey(todayKey), [todayKey]);

  const handleEventClick = useCallback(
    (ev) => {
      if (onEventClick) {
        onEventClick(ev);
        return;
      }
      if (ev.type === 'site_inspection' && ev.lead_id) {
        navigate(`/employee/leads/${ev.lead_id}/site-inspection`);
      } else if (ev.type === 'installation' && ev.job_id) {
        navigate(`/employee/installation/${ev.job_id}`);
      } else if (ev.type === 'installation' && ev.project_id) {
        navigate(`/employee/projects/${ev.project_id}`);
      }
    },
    [navigate, onEventClick]
  );

  return (
    <>
      <style>{`
        .ofc-root { background:#fff; border:1px solid #E5E7EB; border-radius:14px; padding:12px; overflow:hidden; }
        .ofc-header { display:grid; grid-template-columns:40px 1fr 40px; align-items:center; padding:6px 8px 4px; }
        .ofc-chevron { display:inline-flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:10px; border:1px solid #E5E7EB; background:#F9FAFB; color:#111827; font-weight:800; cursor:pointer; }
        .ofc-chevron:disabled { opacity:.5; cursor:not-allowed; }
        .ofc-titleWrap { text-align:center; }
        .ofc-title { margin:0; font-size:18px; font-weight:800; color:#0f1a2b; }
        .ofc-todayLink { margin-top:2px; font-size:11px; font-weight:800; color:#2563EB; text-transform:uppercase; letter-spacing:.03em; cursor:pointer; background:transparent; border:none; }
        .ofc-weekbar { display:grid; grid-template-columns:repeat(7,1fr); border:1px solid #E5E7EB; border-radius:10px 10px 0 0; overflow:hidden; }
        .ofc-weekday { padding:10px 8px; font-size:11px; font-weight:800; color:#6B7280; text-transform:uppercase; border-right:1px solid #E5E7EB; }
        .ofc-weekday:last-child { border-right:none; }
        .ofc-grid { display:grid; grid-template-columns:repeat(7,1fr); grid-auto-rows:minmax(110px, auto); border:1px solid #E5E7EB; border-radius:0 0 10px 10px; overflow:hidden; align-items: stretch; }
        .ofc-cell { position:relative; background:#fff; border-right:1px solid #E5E7EB; border-bottom:1px solid #E5E7EB; padding:8px; display:flex; flex-direction:column; gap:4px; min-height: 0; }
        .ofc-cellBody { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; gap: 4px; overflow: hidden; }
        .ofc-cell:nth-child(7n) { border-right:none; }
        .ofc-dateNum { font-weight:800; color:#0f1a2b; font-size:12px; }
        .ofc-outside .ofc-dateNum { color:#9CA3AF; }
        .ofc-today::after { content:''; position:absolute; inset:4px; border:2px solid rgba(37,99,235,0.5); border-radius:8px; pointer-events:none; }
        .ofc-chip { display:flex; align-items:center; gap:6px; padding:6px 8px; border-radius:8px; cursor:pointer; border:1px solid; }
        .ofc-chip:hover { filter:brightness(0.97); }
        .ofc-dot { width:8px; height:8px; border-radius:999px; flex:0 0 auto; }
        .ofc-chipTitle { font-weight:700; color:#0f1a2b; font-size:12px; line-height:1.2; }
        .ofc-chipSub { color:#6B7280; font-size:11px; }
        .ofc-more { font-size:12px; color:#374151; padding-left:2px; }
        .ofc-viewMoreBtn {
          margin-top: 2px;
          padding: 4px 6px;
          font-size: 11px;
          font-weight: 700;
          color: #2563EB;
          background: #F0F9FF;
          border: 1px solid #BFDBFE;
          border-radius: 6px;
          cursor: pointer;
          text-align: center;
          width: 100%;
          line-height: 1.2;
        }
        .ofc-viewMoreBtn:hover { background: #E0F2FE; }

        /* ---- Day timeline ---- */
        .ofc-dayWrap { border:1px solid #E5E7EB; border-radius: 12px; overflow: hidden; }
        .ofc-dayScroll { max-height: 520px; overflow: auto; background: #fff; }
        .ofc-dayGrid { position: relative; display: grid; grid-template-columns: 62px 1fr; }
        .ofc-timeCol { border-right: 1px solid #E5E7EB; background: #F9FAFB; }
        .ofc-timeRow { height: 60px; border-bottom: 1px solid #F3F4F6; padding: 8px 8px 0; font-size: 11px; color: #6B7280; font-weight: 700; }
        .ofc-trackCol { position: relative; }
        .ofc-trackRow { height: 60px; border-bottom: 1px solid #F3F4F6; }
        .ofc-eventBlock { position: absolute; left: 10px; right: 10px; border-radius: 12px; border: 1px solid; padding: 10px 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); cursor: pointer; }
        .ofc-nowLine { position: absolute; left: 0; right: 0; height: 2px; background: rgba(239,68,68,0.7); }
        .ofc-nowDot { position: absolute; left: -4px; width: 10px; height: 10px; border-radius: 50%; background: #EF4444; top: -4px; }
      `}</style>

      <div className="ofc-root" role="region" aria-label="On-field calendar">
        <div className="ofc-header">
          <button type="button" className="ofc-chevron" onClick={goPrev} aria-label="Previous">
            ‹
          </button>
          <div className="ofc-titleWrap">
            <h3 className="ofc-title">{headerTitle}</h3>
            <button type="button" className="ofc-todayLink" onClick={goToday}>
              GO TO TODAY
            </button>
          </div>
          <button type="button" className="ofc-chevron" onClick={goNext} aria-label="Next">
            ›
          </button>
        </div>

        {viewMode !== 'day' && (
          <div className="ofc-weekbar">
            {weekdayLabels.map((w, i) => (
              <div key={i} className="ofc-weekday">
                {w.toUpperCase()}
              </div>
            ))}
          </div>
        )}

        {viewMode === 'day' ? (
          (() => {
            const dayKey = viewFocusKey;
            const items = byDay.get(dayKey) || [];
            const isToday = dayKey === todayKey;

            const START_HOUR = 6;
            const END_HOUR = 20;
            const PX_PER_MIN = 1; // 60px per hour
            const totalMins = (END_HOUR - START_HOUR) * 60;
            const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

            const now = new Date();
            const nowKey = toKeyInTz(now, TZ) || safeTodayKey();
            const nowMinutes = now.getHours() * 60 + now.getMinutes();
            const nowOffset = (nowMinutes - START_HOUR * 60) * PX_PER_MIN;

            const blocks = items.map((ev) => {
              const d = new Date(ev.start);
              const mins = d.getHours() * 60 + d.getMinutes();
              const top = (mins - START_HOUR * 60) * PX_PER_MIN;
              const dur = 60; // default 60m
              const height = Math.max(44, dur * PX_PER_MIN);
              const colors = JOB_TYPE_COLORS[ev.type] || JOB_TYPE_COLORS.site_inspection;
              return { ev, top, height, colors };
            }).filter(b => b.top + b.height > 0 && b.top < totalMins);

            return (
              <div className="ofc-dayWrap" style={{ marginTop: 12 }}>
                <div className="ofc-dayScroll">
                  <div className="ofc-dayGrid" style={{ height: totalMins * PX_PER_MIN }}>
                    <div className="ofc-timeCol">
                      {hours.map((h) => (
                        <div key={h} className="ofc-timeRow">
                          {String(h).padStart(2, '0')}:00
                        </div>
                      ))}
                    </div>
                    <div className="ofc-trackCol">
                      {hours.map((h) => (
                        <div key={h} className="ofc-trackRow" aria-hidden="true" />
                      ))}

                      {isToday && nowKey === dayKey && nowOffset >= 0 && nowOffset <= totalMins * PX_PER_MIN && (
                        <div className="ofc-nowLine" style={{ top: nowOffset }}>
                          <span className="ofc-nowDot" aria-hidden />
                        </div>
                      )}

                      {blocks.map(({ ev, top, height, colors }) => (
                        <div
                          key={ev.id}
                          className="ofc-eventBlock"
                          style={{
                            top,
                            height,
                            background: colors.bg,
                            borderColor: colors.border,
                          }}
                          onClick={() => handleEventClick(ev)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') handleEventClick(ev);
                          }}
                          title={ev.title}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="ofc-dot" style={{ background: colors.dot }} aria-hidden />
                            <div style={{ fontWeight: 800, color: '#0f1a2b', fontSize: 13, lineHeight: 1.2 }}>
                              {ev.title}
                            </div>
                          </div>
                          <div style={{ marginTop: 4, fontSize: 12, color: '#6B7280', fontWeight: 600 }}>
                            {getEventTimeLabel(ev)}{ev.address ? ` · ${ev.address}` : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()
        ) : (
          <div
            className="ofc-grid"
            style={{
              gridTemplateColumns: `repeat(${7}, 1fr)`,
            }}
          >
            {days.map((d, idx) => {
              const items = byDay.get(d.key) || [];
              const isToday = d.key === todayKey;
              const preview = items.slice(0, MAX_GRID_EVENTS);
              const moreCount = items.length - preview.length;

              return (
                <div
                  key={idx}
                  className={`ofc-cell ${isToday ? 'ofc-today' : ''} ${d.outside ? 'ofc-outside' : ''}`}
                >
                  <div className="ofc-dateNum">{dayNumInTz(d.key, TZ)}</div>
                  <div className="ofc-cellBody">
                    {preview.map((ev, i) => {
                      const colors = JOB_TYPE_COLORS[ev.type] || JOB_TYPE_COLORS.site_inspection;
                      return (
                        <div
                          key={ev.id || i}
                          className="ofc-chip"
                          style={{
                            background: colors.bg,
                            borderColor: colors.border,
                          }}
                          onClick={() => handleEventClick(ev)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ')
                              handleEventClick(ev);
                          }}
                          role="button"
                          tabIndex={0}
                          title={ev.title}
                        >
                          <span className="ofc-dot" style={{ background: colors.dot }} aria-hidden />
                          <div>
                            <div className="ofc-chipTitle">{ev.title}</div>
                            <div className="ofc-chipSub">
                              {getEventTimeLabel(ev)}
                              {ev.address ? ` · ${ev.address}` : ''}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {moreCount > 0 && (
                      <button
                        type="button"
                        className="ofc-viewMoreBtn"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onViewMoreDay) {
                            onViewMoreDay(d.key);
                          } else {
                            setViewFocusKey(d.key);
                          }
                        }}
                      >
                        View {moreCount} more
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, marginTop: 12, flexWrap: 'wrap' }}>
        {Object.entries(JOB_TYPE_COLORS).map(([type, { dot, label }]) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: dot,
              }}
            />
            <span style={{ fontSize: 13, color: '#374151' }}>{label}</span>
          </div>
        ))}
      </div>
    </>
  );
}
