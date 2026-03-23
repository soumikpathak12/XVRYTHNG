/**
 * Admin On-Field page: View all site inspections with status filters.
 * Shows inspections across all leads with customer details, status, dates, etc.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, isToday } from 'date-fns';
import { authFetchJSON } from '../../services/api.js';
import { Calendar, User, MapPin, Search, TrendingUp } from 'lucide-react';

const STATUS_COLORS = {
  draft: { bg: '#E3F2FD', text: '#1976D2', label: 'Draft' },
  submitted: { bg: '#E8F5E9', text: '#388E3C', label: 'Completed' },
  scheduled: { bg: '#E8F5E9', text: '#388E3C', label: 'Scheduled Today' },
};

export default function AdminOnFieldPage() {
  const navigate = useNavigate();
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Load all site inspections
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
  }, [searchTerm]);

  // Categorize inspections
  const categorized = React.useMemo(() => {
    const draft = [];
    const submitted = [];
    const scheduledToday = [];

    inspections.forEach((insp) => {
      // Check if scheduled for today
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

  const stats = React.useMemo(() => {
    return {
      total: inspections.length,
      draft: categorized.draft.length,
      submitted: categorized.submitted.length,
      scheduled: categorized.scheduledToday.length,
    };
  }, [inspections, categorized]);

  const handleInspectionClick = (leadId) => {
    navigate(`/admin/leads/${leadId}/site-inspection`);
  };

  const StatCard = ({ title, value, change, color = '#1A7B7B' }) => (
    <div
      style={{
        padding: '1.5rem',
        backgroundColor: '#FFF',
        border: '1px solid #E5E7EB',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div>
          <p style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: '0.875rem', fontWeight: '500' }}>
            {title}
          </p>
          <p style={{ margin: '0', fontSize: '2rem', fontWeight: '700', color }}>{value}</p>
        </div>
      </div>
      {change && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10B981', fontSize: '0.875rem' }}>
          <TrendingUp size={16} />
          {change}
        </div>
      )}
    </div>
  );

  const InspectionCard = ({ inspection, status }) => {
    const colors = STATUS_COLORS[status] || STATUS_COLORS.draft;
    const dateToDisplay = status === 'scheduled' 
      ? inspection.site_inspection_date 
      : inspection.inspected_at;

    return (
      <div
        style={{
          padding: '1.25rem',
          backgroundColor: colors.bg,
          border: `1px solid ${colors.text}33`,
          borderRadius: '0.375rem',
          cursor: 'pointer',
          minHeight: '160px',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
        onClick={() => handleInspectionClick(inspection.lead_id)}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h4 style={{ margin: '0', color: colors.text, fontSize: '0.9rem', fontWeight: '600' }}>
            {inspection.customer_name}
          </h4>
          <span
            style={{
              paddingRight: '0.5rem',
              color: colors.text,
              fontSize: '0.75rem',
              fontWeight: '500',
            }}
          >
            {colors.label}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: colors.text, fontSize: '0.8rem' }}>
          <MapPin size={14} />
          {inspection.suburb || 'Address not set'}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: colors.text, fontSize: '0.8rem' }}>
          <User size={14} />
          {inspection.inspector_name || 'No inspector'}
        </div>

        {dateToDisplay && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: colors.text, fontSize: '0.8rem' }}>
            <Calendar size={14} />
            {format(new Date(dateToDisplay), 'MMM dd, yyyy HH:mm')}
          </div>
        )}
      </div>
    );
  };

  const SectionContainer = ({ title, inspections: items, status }) => {
    if (items.length === 0) return null;

    return (
      <div style={{ marginBottom: '3rem' }}>
        <div style={{ marginBottom: '1.5rem', paddingBottom: '0.75rem', borderBottom: '1px solid #D1D5DB' }}>
          <h2 style={{ margin: '0', fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>
            {title}
          </h2>
          <p style={{ margin: '0.25rem 0 0 0', color: '#888', fontSize: '0.8rem' }}>
            {items.length} {items.length === 1 ? 'inspection' : 'inspections'}
          </p>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '1rem',
          }}
        >
          {items.map((inspection) => (
            <InspectionCard key={inspection.id} inspection={inspection} status={status} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '2rem', backgroundColor: '#F9FAFB', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ color: '#1A7B7B', fontSize: '2rem', margin: '0 0 0.5rem 0' }}>
          Site Inspections Dashboard
        </h1>
        <p style={{ color: '#666', margin: '0' }}>
          Real-time view of all on-field site inspection activities
        </p>
      </div>

      {/* Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        <StatCard
          title="Total Inspections"
          value={stats.total}
          color="#1A7B7B"
          change={`${categorized.scheduledToday.length} today`}
        />
        <StatCard
          title="Scheduled Today"
          value={stats.scheduled}
          color="#F57C00"
        />
        <StatCard
          title="Draft"
          value={stats.draft}
          color="#1976D2"
        />
        <StatCard
          title="Completed"
          value={stats.submitted}
          color="#388E3C"
        />
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ position: 'relative', maxWidth: '400px' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#999',
            }}
          />
          <input
            type="text"
            placeholder="Search by customer name, email, or suburb..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 0.75rem 0.75rem 2.5rem',
              border: '1px solid #D1D5DB',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              boxSizing: 'border-box',
              backgroundColor: '#FFF',
            }}
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: '#FEE2E2',
            color: '#DC2626',
            borderRadius: '0.375rem',
            marginBottom: '2rem',
          }}
        >
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem 2rem', color: '#999' }}>
          Loading inspections...
        </div>
      )}

      {/* Empty State */}
      {!loading && inspections.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '3rem 2rem',
            backgroundColor: '#FFF',
            borderRadius: '0.5rem',
            color: '#999',
            border: '1px solid #E5E7EB',
          }}
        >
          <p style={{ margin: '0', fontSize: '1rem' }}>No site inspections found.</p>
        </div>
      )}

      {/* Inspection Sections */}
      {!loading && inspections.length > 0 && (
        <div>
          <SectionContainer
            title="Scheduled today"
            inspections={categorized.scheduledToday}
            status="scheduled"
          />
          <SectionContainer
            title="Completed"
            inspections={categorized.submitted}
            status="submitted"
          />
          <SectionContainer
            title="Draft"
            inspections={categorized.draft}
            status="draft"
          />
        </div>
      )}
    </div>
  );
}
