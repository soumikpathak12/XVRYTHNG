import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { listEmployees } from '../../services/api';
import './InspectionScheduleModal.css';

/**
 * Parse lead's site_inspection_date (datetime string) into { date, time } for inputs.
 * If the date is in the past, returns empty date so user picks a new one (avoids disabled Schedule button).
 */
function parseInspectionDateTime(siteInspectionDate) {
  if (!siteInspectionDate) return { date: '', time: '09:00' };
  const d = new Date(siteInspectionDate);
  if (Number.isNaN(d.getTime())) return { date: '', time: '09:00' };
  const now = new Date();
  if (d < now) return { date: '', time: '09:00' }; // past → don't pre-fill so Schedule stays enabled
  const date = d.toISOString().slice(0, 10);
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return { date, time };
}

/**
 * Modal for scheduling an inspection with date/time and inspector selection.
 * Validates against past dates and inspector conflicts.
 * When `lead` is provided, pre-fills date, time and inspector from existing schedule.
 */
const InspectionScheduleModal = ({ open, onClose, leadId, lead, onScheduled }) => {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [inspectorId, setInspectorId] = useState('');
  const [inspectors, setInspectors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [conflicts, setConflicts] = useState([]);

  useEffect(() => {
    if (open) {
      const { date: initialDate, time: initialTime } = lead ? parseInspectionDateTime(lead.site_inspection_date) : { date: '', time: '09:00' };
      setDate(initialDate);
      setTime(initialTime);
      setInspectorId(lead?.inspector_id != null ? String(lead.inspector_id) : '');
      setError('');
      setConflicts([]);
      listEmployees({ status: 'active' }).then(res => {
        setInspectors(res.data || []);
      });
    }
  }, [open, lead]);

  // Validate date/time is not in the past
  const isPastDateTime = () => {
    if (!date || !time) return false;
    const selected = new Date(`${date}T${time}`);
    return selected < new Date();
  };

  // Check for inspector conflicts
  const checkConflicts = async () => {
    if (!inspectorId || !date || !time) return;
    setLoading(true);
    setError('');
    setConflicts([]);
    try {
      // Direct fetch for schedule check
      const token = localStorage.getItem('xvrythng_token');
      const res = await fetch(`/api/employees/${inspectorId}/schedule?date=${date}&time=${time}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (res.ok && data.conflicts) {
        setConflicts(data.conflicts);
      } else {
        setConflicts([]);
      }
    } catch (e) {
      setError('Could not check inspector schedule.');
    } finally {
      setLoading(false);
    }
  };

  // Run conflict check only for future date/time (avoid disabling button for past pre-fill)
  const isPast = isPastDateTime();
  useEffect(() => {
    if (inspectorId && date && time && !isPast) {
      checkConflicts();
    } else {
      setConflicts([]);
    }
    // eslint-disable-next-line
  }, [inspectorId, date, time, isPast]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (isPastDateTime()) {
      setError('Cannot schedule in the past.');
      return;
    }
    if (conflicts.length > 0) {
      setError('Inspector has a conflicting schedule.');
      return;
    }
    setLoading(true);
    try {
      // PATCH /api/leads/:leadId/schedule
      const token = localStorage.getItem('xvrythng_token');
      const res = await fetch(`/api/leads/${leadId}/schedule`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          scheduledDate: date,
          scheduledTime: time,
          inspectorId,
        }),
      });
      if (!res.ok) throw new Error('Failed to schedule');
      onScheduled && onScheduled();
      onClose();
    } catch (e) {
      setError('Failed to schedule inspection.');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const canSubmit = date && time && inspectorId && !loading && conflicts.length === 0;

  return (
    <div className="inspection-schedule-overlay" onClick={onClose}>
      <div
        className="inspection-schedule-modal"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-labelledby="inspection-schedule-title"
      >
        <h2 id="inspection-schedule-title">Schedule Inspection</h2>
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="inspection-date">Date</label>
            <input
              id="inspection-date"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="inspection-time">Time</label>
            <input
              id="inspection-time"
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="inspection-inspector">Inspector</label>
            <select
              id="inspection-inspector"
              value={inspectorId}
              onChange={e => setInspectorId(e.target.value)}
              required
            >
              <option value="">Select inspector</option>
              {inspectors.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
              ))}
            </select>
          </div>
          {isPastDateTime() && date && time && (
            <div className="inspection-schedule-warning">This date and time are in the past. Choose a future date to schedule.</div>
          )}
          {conflicts.length > 0 && (
            <div className="inspection-schedule-error">Inspector has a conflict at this time. Choose another time or inspector.</div>
          )}
          {error && <div className="inspection-schedule-error">{error}</div>}
          <div className="inspection-schedule-actions">
            <button type="button" className="inspection-schedule-cancel" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button
              type="submit"
              className="inspection-schedule-submit"
              disabled={!canSubmit}
            >
              {loading ? 'Saving…' : 'Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

InspectionScheduleModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  leadId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  lead: PropTypes.shape({
    site_inspection_date: PropTypes.string,
    inspector_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    inspector_name: PropTypes.string,
  }),
  onScheduled: PropTypes.func,
};

export default InspectionScheduleModal;
