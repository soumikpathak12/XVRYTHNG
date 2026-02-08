/**
 * Companies (tenants) list – Super Admin only.
 * Add company → Company onboarding wizard.
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../../services/api.js';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .listCompanies()
      .then((r) => setCompanies(r.data || []))
      .catch((e) => setError(e.message || 'Failed to load companies'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: '#555' }}>Loading companies…</p>;
  if (error) return <p style={{ color: '#c82333' }}>{error}</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0, color: '#1A7B7B' }}>Companies</h2>
        <Link
          to="/admin/companies/new"
          style={{
            padding: '10px 20px',
            background: '#1A7B7B',
            color: '#fff',
            borderRadius: 10,
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          Add company
        </Link>
      </div>
      <p style={{ color: '#555', marginBottom: 16 }}>
        Each company is an isolated tenant with its own admin and data.
      </p>
      {companies.length === 0 ? (
        <p style={{ color: '#6B7280' }}>No companies yet. Create one with &quot;Add company&quot;.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #E5E7EB', textAlign: 'left' }}>
              <th style={{ padding: 12 }}>Name</th>
              <th style={{ padding: 12 }}>Slug</th>
              <th style={{ padding: 12 }}>Type</th>
              <th style={{ padding: 12 }}>Status</th>
              <th style={{ padding: 12 }}>Contact</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                <td style={{ padding: 12, fontWeight: 600 }}>{c.name}</td>
                <td style={{ padding: 12, fontFamily: 'monospace', fontSize: 13 }}>{c.slug}</td>
                <td style={{ padding: 12 }}>{(c.company_type_name || '-').replace(/_/g, ' ')}</td>
                <td style={{ padding: 12 }}>{c.status}</td>
                <td style={{ padding: 12 }}>{c.contact_email || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
