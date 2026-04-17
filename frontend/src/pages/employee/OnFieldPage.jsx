/**
 * On-Field page for employees: Calendar (US-053) + Optimised Route (US-054).
 * - Calendar: site inspections + installations, month/week/day, colour legend, click → form.
 * - Route: day's jobs in order, map link, one-tap Open in Google Maps.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { getOnFieldCalendar } from '../../services/api.js';
import * as api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import OnFieldCalendar from '../../components/onfield/OnFieldCalendar.jsx';
import { MapPin, Calendar, Route, ExternalLink } from 'lucide-react';

function buildGoogleMapsRouteUrl(stops) {
  // stops: array of { address } (address can be full or suburb)
  const encoded = stops
    .map((s) => encodeURIComponent(s.address || s.suburb || ''))
    .filter(Boolean);
  if (encoded.length === 0) return null;
  if (encoded.length === 1) {
    return `https://www.google.com/maps/search/?api=1&query=${encoded[0]}`;
  }
  const origin = encoded[0];
  const destination = encoded[encoded.length - 1];
  const waypoints = encoded.slice(1, -1).join('|');
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;
}

export default function OnFieldPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState('calendar');
  const [viewMode, setViewMode] = useState('day'); // prefer daily, then week, then month
  const [showCalendar, setShowCalendar] = useState(false); // only show when user taps "View Calendar"
  /** When set, OnFieldCalendar focuses this YYYY-MM-DD (e.g. after "View N more") */
  const [calendarFocusDayKey, setCalendarFocusDayKey] = useState(null);
  const clearCalendarFocusDay = useCallback(() => {
    setCalendarFocusDayKey(null);
  }, []);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [range] = useState(() => {
    const now = new Date();
    const start = startOfMonth(subMonths(now, 2));
    const end = endOfMonth(addMonths(now, 3));
    return {
      from: format(start, 'yyyy-MM-dd'),
      to: format(end, 'yyyy-MM-dd'),
    };
  });

  const fetchCalendar = useCallback(async (from, to) => {
    setLoading(true);
    setError('');
    try {
      const res = await getOnFieldCalendar({ from, to });
      setEvents(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      setError(e?.message || 'Failed to load calendar');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendar(range.from, range.to);
  }, [range.from, range.to, fetchCalendar]);

  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const todayEvents = React.useMemo(() => {
    return events
      .filter((ev) => ev.start && ev.start.toString().slice(0, 10) === todayKey)
      .sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  }, [events, todayKey]);

  const [routeDate, setRouteDate] = useState(todayKey);

  const dayEvents = React.useMemo(() => {
    return events
      .filter((ev) => ev.start && ev.start.toString().slice(0, 10) === routeDate)
      .sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  }, [events, routeDate]);

  const routeStops = React.useMemo(() => {
    return dayEvents.map((ev) => ({
      title: ev.title,
      address: ev.address || ev.customer_name || 'Address not set',
      type: ev.type,
      lead_id: ev.lead_id,
      job_id: ev.job_id,
    }));
  }, [dayEvents]);

  const googleMapsUrl = React.useMemo(
    () => buildGoogleMapsRouteUrl(routeStops),
    [routeStops]
  );

  // ---- Attendance status (Check In / Out) reused from AttendancePage ----
  const [attStatus, setAttStatus] = useState(null);
  const [attLoading, setAttLoading] = useState(false);
  const [attError, setAttError] = useState(null);
  const [elapsed, setElapsed] = useState(0);

  const fetchAttendanceStatus = useCallback(async () => {
    try {
      setAttLoading(true);
      const data = await api.authFetchJSON('/api/employees/attendance/today', { method: 'GET' });
      setAttStatus(data?.data || null);
    } catch (err) {
      setAttError('Failed to load attendance status');
    } finally {
      setAttLoading(false);
    }
  }, []);

  useEffect(() => { fetchAttendanceStatus(); }, [fetchAttendanceStatus]);

  useEffect(() => {
    let interval;
    if (attStatus?.check_in_time && !attStatus?.check_out_time) {
      interval = setInterval(() => {
        setElapsed(Date.now() - new Date(attStatus.check_in_time).getTime());
      }, 1000);
    } else {
      setElapsed(0);
    }
    return () => clearInterval(interval);
  }, [attStatus]);

  const getLocation = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported on this device/browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () =>
        reject(
          new Error(
            'Location access is required for attendance. Please enable GPS/location permission and try again.',
          ),
        ),
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );
  });

  const handleAttendanceAction = async (action) => {
    setAttError(null);
    setAttLoading(true);
    try {
      const { lat, lng } = await getLocation();
      await api.authFetchJSON(`/api/employees/attendance/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng }),
      });
      await fetchAttendanceStatus();
    } catch (err) {
      setAttError(err?.message || `Failed to ${action.replace('-', ' ')}`);
    } finally {
      setAttLoading(false);
    }
  };

  const isCheckedIn = !!attStatus?.check_in_time && !attStatus?.check_out_time;

  const fmtTime = (v) => (v ? new Date(v).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }) : '--');

  const calcDuration = (ms) => {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
    return `${m}m`;
  };

  const tabStyle = (active) => ({
    padding: '10px 16px',
    borderRadius: 10,
    border: 'none',
    background: active ? '#146b6b' : '#F3F4F6',
    color: active ? '#fff' : '#374151',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  });

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#0f1a2b' }}>
        On-Field
      </h1>
      <p style={{ marginTop: 6, color: '#6B7280' }}>
        Your scheduled site inspections and installations. Use the \"Today's Jobs\" list to start work quickly, and the calendar/route views to plan your day.
      </p>

      {/* Active status / attendance header (Check In / Out) */}
      <div style={{ marginTop: 20, marginBottom: 18, background: '#146b6b', borderRadius: 18, padding: '16px 18px', color: '#E5E7EB', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 800, opacity: 0.9 }}>
              Active Status
            </div>
            <div style={{ marginTop: 4, fontSize: 18, fontWeight: 900, color: '#fff' }}>
              {isCheckedIn ? 'Checked In' : 'Not Checked In'}
            </div>
            <div style={{ marginTop: 2, fontSize: 12, opacity: 0.9 }}>
              {attStatus?.check_in_time && !attStatus?.check_out_time && (
                <>Started at {fmtTime(attStatus.check_in_time)} · {elapsed > 0 ? calcDuration(elapsed) : '--'} so far</>
              )}
              {!attStatus?.check_in_time && 'You have not checked in today.'}
              {attStatus?.check_in_time && attStatus?.check_out_time && `Shift completed (${fmtTime(attStatus.check_in_time)} – ${fmtTime(attStatus.check_out_time)})`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {!isCheckedIn && !attStatus?.check_out_time && (
              <button
                type="button"
                onClick={() => handleAttendanceAction('check-in')}
                disabled={attLoading}
                style={{
                  padding: '10px 22px',
                  borderRadius: 999,
                  border: 'none',
                  background: '#10B981',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: 15,
                  cursor: attLoading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(16,185,129,0.4)',
                }}
              >
                {attLoading ? 'Checking in…' : 'Check In Now'}
              </button>
            )}
            {isCheckedIn && (
              <button
                type="button"
                onClick={() => handleAttendanceAction('check-out')}
                disabled={attLoading}
                style={{
                  padding: '10px 22px',
                  borderRadius: 999,
                  border: 'none',
                  background: '#F97316',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: 15,
                  cursor: attLoading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(248,113,113,0.4)',
                }}
              >
                {attLoading ? 'Checking out…' : 'Check Out'}
              </button>
            )}
          </div>
        </div>
        {attError && (
          <div style={{ marginTop: 4, fontSize: 12, color: '#FEE2E2' }}>
            {attError}
          </div>
        )}
      </div>

      {/* Today's Jobs (similar layout to dashboard cards) */}
      <div style={{ marginTop: 4, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#6B7280', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Today's Jobs
          </div>
        </div>
        <button
          type="button"
          onClick={() => { setShowCalendar(true); setTab('calendar'); }}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#146b6b',
            fontWeight: 800,
            cursor: 'pointer',
            padding: 0,
            textDecoration: 'underline',
          }}
        >
          View Calendar
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 16, background: '#F9FAFB', borderRadius: 12, color: '#6B7280', marginBottom: 20 }}>
          Loading today's jobs…
        </div>
      ) : todayEvents.length === 0 ? (
        <div style={{ padding: 16, background: '#F9FAFB', borderRadius: 12, color: '#6B7280', marginBottom: 20 }}>
          No jobs scheduled for today.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          {todayEvents.map((ev) => {
            const isInspection = ev.type === 'site_inspection';
            const label = isInspection ? 'Site Inspection' : 'Installation Day';
            const chipBg = isInspection ? '#ECFDF5' : '#EFF6FF';
            const chipColor = isInspection ? '#047857' : '#1D4ED8';
            const timeStr = ev.start ? format(new Date(ev.start), 'hh:mm a') : '';
            const address = ev.address || ev.customer_name || '';
            const directionsUrl = address
              ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
              : null;

            const handleStart = () => {
              if (isInspection && ev.lead_id) {
                navigate(`/employee/leads/${ev.lead_id}/site-inspection`);
              } else if (!isInspection && ev.job_id) {
                navigate(`/employee/installation/${ev.job_id}`);
              } else if (!isInspection && ev.project_id) {
                navigate(`/employee/projects/${ev.project_id}`);
              }
            };

            return (
              <div
                key={ev.id}
                style={{
                  background: '#fff',
                  borderRadius: 16,
                  border: '1px solid #E5E7EB',
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '3px 10px',
                        borderRadius: 999,
                        background: chipBg,
                        color: chipColor,
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {label}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 17, fontWeight: 800, color: '#111827' }}>
                      {ev.customer_name || ev.title}
                    </div>
                    {ev.address && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, color: '#6B7280', fontSize: 13 }}>
                        <MapPin size={14} color="#146b6b" />
                        <span>{ev.address}</span>
                      </div>
                    )}
                  </div>
                  {timeStr && (
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#6B7280', whiteSpace: 'nowrap' }}>
                      {timeStr}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    disabled={!directionsUrl}
                    onClick={() => directionsUrl && window.open(directionsUrl, '_blank', 'noopener')}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      borderRadius: 999,
                      border: '1px solid #E5E7EB',
                      background: '#F9FAFB',
                      color: '#374151',
                      fontWeight: 600,
                      fontSize: 14,
                      cursor: directionsUrl ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Directions
                  </button>
                  <button
                    type="button"
                    onClick={handleStart}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      borderRadius: 999,
                      border: 'none',
                      background: '#146b6b',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: 'pointer',
                    }}
                  >
                    Start Job
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Calendar/Route tabs are shown only after user taps \"View Calendar\" */}
      {tab === 'calendar' && (
        <>
          <div style={{ display: showCalendar ? 'flex' : 'none', gap: 12, marginTop: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <button style={tabStyle(tab === 'calendar')} onClick={() => setTab('calendar')}>
              <Calendar size={18} />
              Calendar
            </button>
            <button style={tabStyle(tab === 'route')} onClick={() => setTab('route')}>
              <Route size={18} />
              Optimised Route
            </button>
          </div>

          <div style={{ display: showCalendar ? 'flex' : 'none', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            {['day', 'week', 'month'].map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #E5E7EB',
                  background: viewMode === mode ? '#E5E7EB' : '#fff',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  cursor: 'pointer',
                }}
              >
                {mode}
              </button>
            ))}
          </div>

          {error && (
            <div style={{ marginTop: 12, padding: 12, background: '#FEF2F2', color: '#B91C1C', borderRadius: 8 }}>
              {error}
            </div>
          )}

          {!showCalendar ? null : loading ? (
            <div style={{ marginTop: 24, color: '#6B7280' }}>Loading calendar…</div>
          ) : (
            <div style={{ marginTop: 16 }}>
              <OnFieldCalendar
                events={events}
                viewMode={viewMode}
                focusDayKey={calendarFocusDayKey}
                onFocusDayConsumed={clearCalendarFocusDay}
                onViewMoreDay={(dayKey) => {
                  setCalendarFocusDayKey(dayKey);
                  setViewMode('day');
                }}
                onEventClick={(ev) => {
                  if (ev.type === 'site_inspection' && ev.lead_id) {
                    navigate(`/employee/leads/${ev.lead_id}/site-inspection`);
                  } else if (ev.type === 'installation' && ev.job_id) {
                    navigate(`/employee/installation/${ev.job_id}`);
                  } else if (ev.type === 'installation' && ev.project_id) {
                    navigate(`/employee/projects/${ev.project_id}`);
                  }
                }}
              />
            </div>
          )}
        </>
      )}

      {showCalendar && tab === 'route' && (
        <div style={{ marginTop: 16 }}>
          <p style={{ color: '#6B7280', marginBottom: 12 }}>
            Jobs for the selected day, ordered by scheduled time. Route recalculates when you change the day or when jobs change.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <label style={{ fontWeight: 600, color: '#374151' }}>Date</label>
            <input
              type="date"
              value={routeDate}
              onChange={(e) => setRouteDate(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #E5E7EB',
                fontSize: 14,
              }}
            />
          </div>

          {dayEvents.length === 0 ? (
            <div style={{ padding: 24, background: '#F9FAFB', borderRadius: 12, color: '#6B7280', textAlign: 'center' }}>
              No jobs scheduled for this day. Select another date or check the calendar.
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                {dayEvents.map((ev, i) => (
                  <div
                    key={ev.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 14,
                      background: '#fff',
                      border: '1px solid #E5E7EB',
                      borderRadius: 12,
                    }}
                  >
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: ev.type === 'site_inspection' ? '#059669' : '#2563EB',
                        color: '#fff',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: 13,
                      }}
                    >
                      {i + 1}
                    </span>
                    <MapPin size={18} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: '#111827' }}>{ev.title}</div>
                      <div style={{ fontSize: 13, color: '#6B7280' }}>
                        {ev.start && format(new Date(ev.start), 'HH:mm')}
                        {ev.address ? ` · ${ev.address}` : ''}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (ev.type === 'site_inspection' && ev.lead_id) {
                          navigate(`/employee/leads/${ev.lead_id}/site-inspection`);
                        } else if (ev.type === 'installation' && ev.job_id) {
                          navigate(`/employee/installation/${ev.job_id}`);
                        } else if (ev.type === 'installation' && ev.project_id) {
                          navigate(`/employee/projects/${ev.project_id}`);
                        }
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 8,
                        border: '1px solid #146b6b',
                        background: '#fff',
                        color: '#146b6b',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: 13,
                      }}
                    >
                      Open
                    </button>
                  </div>
                ))}
              </div>

              {googleMapsUrl && (
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '12px 20px',
                    borderRadius: 10,
                    background: '#146b6b',
                    color: '#fff',
                    fontWeight: 700,
                    textDecoration: 'none',
                    boxShadow: '0 2px 8px rgba(20,107,107,0.3)',
                  }}
                >
                  <ExternalLink size={18} />
                  Open in Google Maps (multi-stop route)
                </a>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
