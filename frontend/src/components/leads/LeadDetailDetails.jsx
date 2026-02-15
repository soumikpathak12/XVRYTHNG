// components/leads/LeadDetailDetails.jsx – editable Details tab
import React from 'react';
import LeadForm from './LeadForm.jsx';

function formatDateTimeLocal(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export default function LeadDetailDetails({ lead, onSubmit }) {
  const initialValues = lead ? {
    customer_name: lead.customer_name,
    suburb: lead.suburb || '',
    system_size_kw: lead.system_size_kw != null ? String(lead.system_size_kw) : '',
    value_amount: lead.value_amount != null ? lead.value_amount : '',
    source: lead.source || '',
    stage: lead.stage || 'new',
    site_inspection_date: formatDateTimeLocal(lead.site_inspection_date),
  } : null;

  return (
    <div className="lead-detail-details">
      <LeadForm
        initialValues={initialValues}
        onSubmit={onSubmit}
        onCancel={() => {}}
        title=""
        submitLabel="Save changes"
        embedded
      />
    </div>
  );
}
