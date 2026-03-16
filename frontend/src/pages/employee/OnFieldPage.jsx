/**
 * On-Field page for employees: Calendar (US-053) + Optimised Route (US-054).
 * - Calendar: site inspections + installations, month/week/day, colour legend, click → form.
 * - Route: day's jobs in order, map link, one-tap Open in Google Maps.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { getOnFieldCalendar } from '../../services/api.js';
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
  const [tab, setTab] = useState('calendar');
  const [viewMode, setViewMode] = useState('month');
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
        Your scheduled site inspections and installations. Use the calendar to plan your day and the route view to get directions.
      </p>

      <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <button style={tabStyle(tab === 'calendar')} onClick={() => setTab('calendar')}>
          <Calendar size={18} />
          Calendar
        </button>
        <button style={tabStyle(tab === 'route')} onClick={() => setTab('route')}>
          <Route size={18} />
          Optimised Route
        </button>
      </div>

      {tab === 'calendar' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
            {['month', 'week', 'day'].map((mode) => (
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

          {loading ? (
            <div style={{ marginTop: 24, color: '#6B7280' }}>Loading calendar…</div>
          ) : (
            <div style={{ marginTop: 16 }}>
              <OnFieldCalendar
                events={events}
                viewMode={viewMode}
                onEventClick={(ev) => {
                  if (ev.type === 'site_inspection' && ev.lead_id) {
                    navigate(`/employee/leads/${ev.lead_id}/site-inspection`);
                  } else if (ev.type === 'installation' && ev.job_id) {
                    navigate(`/employee/installation/${ev.job_id}`);
                  }
                }}
              />
            </div>
          )}
        </>
      )}

      {tab === 'route' && (
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
