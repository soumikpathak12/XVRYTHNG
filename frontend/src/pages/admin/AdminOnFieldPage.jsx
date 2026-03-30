/**
 * Admin On-Field page: View all site inspections with status filters.
 * Shows inspections across all leads with customer details, status, dates, etc.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, isToday } from 'date-fns';
import {
  authFetchJSON,
} from '../../services/api.js';
import {
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileClock,
  MapPin,
  RefreshCw,
  Search,
  TrendingUp,
  User,
} from 'lucide-react';
import './AdminOnFieldPage.css';

const STATUS_THEME = {
  draft: {
    label: 'Draft',
    accent: '#52b69a',
    border: '#52b69a',
    chipBg: '#eeeeee',
    chipText: '#06303f',
  },
  submitted: {
    label: 'Completed',
    accent: '#18877e',
    border: '#18877e',
    chipBg: '#18877e',
    chipText: '#ffffff',
  },
  scheduled: {
    label: 'Scheduled Today',
    accent: '#34a0a4',
    border: '#34a0a4',
    chipBg: '#34a0a4',
    chipText: '#ffffff',
  },
};

export default function AdminOnFieldPage() {
  const navigate = useNavigate();
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchInspections = async () => {
    setLoading(true);
    setError('');

    try {
      const qs = new URLSearchParams();
      if (searchTerm) {
        qs.append('search', searchTerm);
      }

      const queryString = qs.toString() ? `?${qs.toString()}` : '';
      const result = await authFetchJSON(`/api/admin/site-inspections${queryString}`, { method: 'GET' });
      const data = result?.data || [];
      setInspections(Array.isArray(data) ? data : []);
      setLastUpdated(new Date());
    } catch (e) {
      console.error('Failed to load inspections:', e);
      setError(e?.message || 'Failed to load site inspections');
      setInspections([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInspections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const categorized = useMemo(() => {
    const draft = [];
    const submitted = [];
    const scheduledToday = [];

    inspections.forEach((insp) => {
      const schedDate = insp.site_inspection_date ? new Date(insp.site_inspection_date) : null;
      if (schedDate && isToday(schedDate)) {
        scheduledToday.push(insp);
      } else if (insp.status === 'draft') {
        draft.push(insp);
      } else if (insp.status === 'submitted') {
        submitted.push(insp);
      }
    });

    return { draft, submitted, scheduledToday };
  }, [inspections]);

  const stats = useMemo(
    () => ({
      total: inspections.length,
      draft: categorized.draft.length,
      submitted: categorized.submitted.length,
      scheduled: categorized.scheduledToday.length,
    }),
    [inspections, categorized]
  );

  const refreshedLabel = lastUpdated ? format(lastUpdated, 'MMM d, h:mm a') : 'Live view';

  const handleInspectionClick = (leadId) => {
    navigate(`/admin/leads/${leadId}/site-inspection`);
  };

  const statCards = [
    {
      title: 'Total Inspections',
      value: stats.total,
      icon: ClipboardList,
      tone: 'total',
      hint: 'All records',
    },
    {
      title: 'Scheduled Today',
      value: stats.scheduled,
      icon: Clock3,
      tone: 'scheduled',
      hint: 'Today only',
    },
    {
      title: 'Draft',
      value: stats.draft,
      icon: FileClock,
      tone: 'draft',
      hint: 'Needs review',
    },
    {
      title: 'Completed',
      value: stats.submitted,
      icon: CheckCircle2,
      tone: 'completed',
      hint: 'Submitted',
    },
  ];

  const InspectionCard = ({ inspection, status }) => {
    const theme = STATUS_THEME[status] || STATUS_THEME.draft;
    const dateToDisplay = status === 'scheduled' ? inspection.site_inspection_date : inspection.inspected_at;

    return (
      <article
        className={`admin-onfield-inspection-card status-${status}`}
        style={{ '--card-accent': theme.accent, '--card-border': theme.border }}
        role="button"
        tabIndex={0}
        onClick={() => handleInspectionClick(inspection.lead_id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleInspectionClick(inspection.lead_id);
          }
        }}
      >
        <div className="admin-onfield-card-top">
          <div>
            <h4 className="admin-onfield-card-title">{inspection.customer_name}</h4>
            <p className="admin-onfield-card-subtitle">Lead #{inspection.lead_id}</p>
          </div>
          <span
            className="admin-onfield-status-chip"
            style={{ backgroundColor: theme.chipBg, color: theme.chipText }}
          >
            {theme.label}
          </span>
        </div>

        <div className="admin-onfield-card-line">
          <MapPin size={14} />
          <span>{inspection.suburb || 'Address not set'}</span>
        </div>

        <div className="admin-onfield-card-line">
          <User size={14} />
          <span>{inspection.inspector_name || 'No inspector'}</span>
        </div>

        {dateToDisplay && (
          <div className="admin-onfield-card-line">
            <Calendar size={14} />
            <span>{format(new Date(dateToDisplay), 'MMM dd, yyyy HH:mm')}</span>
          </div>
        )}
      </article>
    );
  };

  const SectionContainer = ({ title, items, status, icon: Icon, helper }) => {
    if (!items.length) return null;
    const theme = STATUS_THEME[status] || STATUS_THEME.draft;

    return (
      <section className="admin-onfield-section" style={{ '--section-accent': theme.accent }}>
        <div className="admin-onfield-section-header">
          <div className="admin-onfield-section-title-wrap">
            <span className="admin-onfield-section-icon">
              <Icon size={16} />
            </span>
            <div>
              <h2>{title}</h2>
              <p>{helper}</p>
            </div>
          </div>
          <span className="admin-onfield-section-count">{items.length}</span>
        </div>

        <div className="admin-onfield-card-grid">
          {items.map((inspection) => (
            <InspectionCard key={inspection.id} inspection={inspection} status={status} />
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="admin-onfield-page">
      <header className="admin-onfield-hero">
        <div className="admin-onfield-hero-copy">
          <span className="admin-onfield-kicker">Admin operations</span>
          <h1>Site Inspections Dashboard</h1>
          <p>Real-time view of all on-field site inspection activities.</p>
        </div>

        <div className="admin-onfield-hero-meta">
          <div className="admin-onfield-hero-pill">
            <TrendingUp size={16} />
            <span>{stats.total} inspections</span>
          </div>
          <div className="admin-onfield-hero-pill secondary">
            <RefreshCw size={16} />
            <span>{refreshedLabel}</span>
          </div>
        </div>
      </header>

      <section className="admin-onfield-stats-grid" aria-label="Inspection summary">
        {statCards.map(({ title, value, icon: Icon, tone, hint }) => (
          <div key={title} className={`admin-onfield-stat-card tone-${tone}`}>
            <div className="admin-onfield-stat-top">
              <span className="admin-onfield-stat-icon">
                <Icon size={18} />
              </span>
              <span className="admin-onfield-stat-hint">{hint}</span>
            </div>
            <div className="admin-onfield-stat-body">
              <p>{title}</p>
              <strong>{value}</strong>
            </div>
          </div>
        ))}
      </section>

      <section className="admin-onfield-toolbar" aria-label="Search inspections">
        <div className="admin-onfield-search-wrap">
          <Search size={18} className="admin-onfield-search-icon" />
          <input
            type="search"
            placeholder="Search by customer, email, or suburb..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="admin-onfield-search-input"
          />
          {searchTerm ? (
            <button type="button" className="admin-onfield-search-clear" onClick={() => setSearchTerm('')}>
              Clear
            </button>
          ) : null}
        </div>

        <div className="admin-onfield-toolbar-meta">
          <span>{stats.total} total</span>
          <span>{categorized.scheduledToday.length} scheduled today</span>
        </div>
      </section>

      {error && (
        <div className="admin-onfield-state state-error" role="alert">
          <strong>Unable to load inspections</strong>
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="admin-onfield-state">
          Loading inspections...
        </div>
      )}

      {!loading && inspections.length === 0 && (
        <div className="admin-onfield-state admin-onfield-empty">
          <ClipboardList size={28} />
          <strong>No site inspections found.</strong>
          <span>
            {searchTerm
              ? 'Try a different search term.'
              : 'There are no inspections available at the moment.'}
          </span>
        </div>
      )}

      {!loading && inspections.length > 0 && (
        <div className="admin-onfield-sections">
          <SectionContainer
            title="Scheduled today"
            helper="Inspections planned for today"
            items={categorized.scheduledToday}
            status="scheduled"
            icon={Clock3}
          />
          <SectionContainer
            title="Completed"
            helper="Recently completed inspections"
            items={categorized.submitted}
            status="submitted"
            icon={CheckCircle2}
          />
          <SectionContainer
            title="Draft"
            helper="Inspections still in progress"
            items={categorized.draft}
            status="draft"
            icon={FileClock}
          />
        </div>
      )}
    </div>
  );
}
