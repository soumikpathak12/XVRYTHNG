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
  // Be flexible with the data shape (snake_case, camelCase, or nested in _raw)
  const email =
    lead?.email ?? lead?._raw?.email ?? '';
  const phone =
    lead?.phone ?? lead?._raw?.phone ?? '';
  const suburb =
    lead?.suburb ?? lead?._raw?.suburb ?? '';
  const stage =
    lead?.stage ?? lead?._raw?.stage ?? 'new';
  const systemSizeKw =
    lead?.system_size_kw != null
      ? String(lead.system_size_kw)
      : lead?._raw?.system_size_kw != null
      ? String(lead._raw.system_size_kw)
      : '';
  const valueAmount =
    lead?.value_amount != null
      ? lead.value_amount
      : lead?._raw?.value_amount != null
      ? lead._raw.value_amount
      : '';
  const siteInspectionDateIso =
    lead?.site_inspection_date ?? lead?._raw?.site_inspection_date ?? '';

  const initialValues = lead
    ? {
        customer_name:
          lead.customer_name ?? lead.customerName ?? '',
        email,
        phone,
        suburb,
        system_size_kw: systemSizeKw,
        value_amount: valueAmount,
        source: lead?.source ?? lead?._raw?.source ?? '',
        stage,
        site_inspection_date: formatDateTimeLocal(siteInspectionDateIso),
      }
    : null;

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