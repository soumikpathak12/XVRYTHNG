// components/leads/LeadDetailDetails.jsx – editable Details tab (core form + extras + 2 nút ở cuối)
import React, { useMemo, useState } from 'react';
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
// Coerce 0/1/"0"/"1"/"true"/"false"/"" → true/false/null
function toBoolOrNull(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'boolean') return v;
  const s = String(v).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(s)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(s)) return false;
  return null;
}

export default function LeadDetailDetails({ lead, onSubmit, onBack }) {
  const email = lead?.email ?? lead?._raw?.email ?? '';
  const phone = lead?.phone ?? lead?._raw?.phone ?? '';
  const suburb = lead?.suburb ?? lead?._raw?.suburb ?? '';
  const stage = lead?.stage ?? lead?._raw?.stage ?? 'new';

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

  const initialValues = useMemo(
    () =>
      lead
        ? {
            customer_name: lead.customer_name ?? lead.customerName ?? '',
            email,
            phone,
            suburb,
            system_size_kw: systemSizeKw,
            value_amount: valueAmount,
            source: lead?.source ?? lead?._raw?.source ?? '',
            stage,
            site_inspection_date: formatDateTimeLocal(siteInspectionDateIso),
          }
        : null,
    [lead, email, phone, suburb, systemSizeKw, valueAmount, stage, siteInspectionDateIso],
  );

  const SYSTEM_TYPE_OPTS  = ['PV only', 'PV + Battery', 'Only Battery', 'Only EV Charger', 'PV + Battery + EV Charger', 'Battery + EV Charger','PV + EV Chargers'];
  const HOUSE_STOREY_OPTS = ['Single', 'Double', 'Triple', 'Other'];
  const ROOF_TYPE_OPTS    = ['Tin', 'Tile', 'Flat', 'Other'];
  const METER_PHASE_OPTS  = ['single', 'double', 'tree']; // theo đúng yêu cầu

  const splitForSelectOther = (value, options) => {
    if (!value) return { sel: '', other: '' };
    const found = options.find(o => o.toLowerCase() === String(value).trim().toLowerCase());
    if (found) return { sel: found, other: '' };
    return { sel: 'Other', other: String(value) };
  };

  // ----- New sections state -----
  const [extras, setExtras] = useState(() => {
    // SYSTEM TYPE: split select/other
    const { sel: sysSel, other: sysOther } = splitForSelectOther(
      lead?.system_type ?? lead?.systemType ?? lead?._raw?.system_type ?? '',
      SYSTEM_TYPE_OPTS
    );

    const { sel: storeySel, other: storeyOther } = splitForSelectOther(
      lead?.house_storey ?? lead?.houseStorey ?? lead?._raw?.house_storey ?? '',
      HOUSE_STOREY_OPTS
    );
    const { sel: roofSel, other: roofOther } = splitForSelectOther(
      lead?.roof_type ?? lead?.roofType ?? lead?._raw?.roof_type ?? '',
      ROOF_TYPE_OPTS
    );

    const meterRaw = lead?.meter_phase ?? lead?.meterPhase ?? lead?._raw?.meter_phase ?? '';
    const meterSel = METER_PHASE_OPTS.includes(String(meterRaw).toLowerCase())
      ? String(meterRaw).toLowerCase()
      : '';

    return {
      system_type_sel: sysSel,
      system_type_other: sysOther,

      house_storey_sel: storeySel,
      house_storey_other: storeyOther,

      roof_type_sel: roofSel,
      roof_type_other: roofOther,

      meter_phase_sel: meterSel,

      access_to_second_storey: toBoolOrNull(
        lead?.access_to_second_storey ??
          lead?.accessToSecondStorey ??
          lead?._raw?.access_to_second_storey ??
          null,
      ),
      access_to_inverter: toBoolOrNull(
        lead?.access_to_inverter ??
          lead?.accessToInverter ??
          lead?._raw?.access_to_inverter ??
          null,
      ),
      pre_approval_reference_no:
        lead?.pre_approval_reference_no ??
        lead?.preApprovalReferenceNo ??
        lead?._raw?.pre_approval_reference_no ??
        '',
      energy_retailer:
        lead?.energy_retailer ??
        lead?.energyRetailer ??
        lead?._raw?.energy_retailer ??
        '',
      energy_distributor:
        lead?.energy_distributor ??
        lead?.energyDistributor ??
        lead?._raw?.energy_distributor ??
        '',
      solar_vic_eligibility: toBoolOrNull(
        lead?.solar_vic_eligibility ??
          lead?.solarVicEligibility ??
          lead?._raw?.solar_vic_eligibility ??
          null,
      ),
      nmi_number: lead?.nmi_number ?? lead?.nmiNumber ?? lead?._raw?.nmi_number ?? '',
      meter_number:
        lead?.meter_number ?? lead?.meterNumber ?? lead?._raw?.meter_number ?? '',
    };
  });

  const updateExtra = (key, value) =>
    setExtras((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (corePayload) => {
    // SYSTEM TYPE
    const system_type =
      extras.system_type_sel === 'Other'
        ? ((extras.system_type_other || '').trim() || null)
        : (extras.system_type_sel || null);

    // House Storey
    const house_storey =
      extras.house_storey_sel === 'Other'
        ? ((extras.house_storey_other || '').trim() || null)
        : (extras.house_storey_sel || null);

    // Roof Type
    const roof_type =
      extras.roof_type_sel === 'Other'
        ? ((extras.roof_type_other || '').trim() || null)
        : (extras.roof_type_sel || null);

    const meter_phase = extras.meter_phase_sel || null;

    const merged = {
      ...corePayload,

      system_type,

      house_storey,
      roof_type,
      meter_phase,

      access_to_second_storey:
        extras.access_to_second_storey == null ? null : !!extras.access_to_second_storey,
      access_to_inverter:
        extras.access_to_inverter == null ? null : !!extras.access_to_inverter,

      pre_approval_reference_no:
        (extras.pre_approval_reference_no || '').trim() || null,
      energy_retailer: (extras.energy_retailer || '').trim() || null,
      energy_distributor: (extras.energy_distributor || '').trim() || null,

      solar_vic_eligibility:
        extras.solar_vic_eligibility == null ? null : !!extras.solar_vic_eligibility,

      nmi_number: (extras.nmi_number || '').trim() || null,
      meter_number: (extras.meter_number || '').trim() || null,
    };

    return onSubmit(merged);
  };

  return (
    <div className="lead-detail-details" style={{ display: 'grid', gap: 16 }}>
      <LeadForm
        initialValues={initialValues}
        onSubmit={handleSubmit}
        onCancel={onBack}
        cancelLabel="Back to overview"
        title=""
        submitLabel="Save changes"
        embedded
        formId="lead-core-form"
        hideActions
      />

      <Section title="SYSTEM INFORMATION">
        <FieldRow>
          <Labeled label="SYSTEM TYPE">
            <select
              value={extras.system_type_sel}
              onChange={(e) => updateExtra('system_type_sel', e.target.value)}
              style={inputStyle}
            >
              <option value="">Select</option>
              {SYSTEM_TYPE_OPTS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>

            {extras.system_type_sel === 'Other' && (
              <input
                type="text"
                value={extras.system_type_other}
                onChange={(e) => updateExtra('system_type_other', e.target.value)}
                style={{ ...inputStyle, marginTop: 8 }}
                placeholder="Enter system type"
              />
            )}
          </Labeled>
        </FieldRow>
      </Section>

      <Section title="PROPERTY INFORMATION">
        <FieldRow two>
          {/* HOUSE STOREY = select + other */}
          <Labeled label="HOUSE STOREY">
            <select
              value={extras.house_storey_sel}
              onChange={(e) => updateExtra('house_storey_sel', e.target.value)}
              style={inputStyle}
            >
              <option value="">Select</option>
              {HOUSE_STOREY_OPTS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            {extras.house_storey_sel === 'Other' && (
              <input
                type="text"
                value={extras.house_storey_other}
                onChange={(e) => updateExtra('house_storey_other', e.target.value)}
                style={{ ...inputStyle, marginTop: 8 }}
                placeholder="Enter storey (e.g., Split-level)"
              />
            )}
          </Labeled>

          {/* ROOF TYPE = select + other */}
          <Labeled label="ROOF TYPE">
            <select
              value={extras.roof_type_sel}
              onChange={(e) => updateExtra('roof_type_sel', e.target.value)}
              style={inputStyle}
            >
              <option value="">Select</option>
              {ROOF_TYPE_OPTS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            {extras.roof_type_sel === 'Other' && (
              <input
                type="text"
                value={extras.roof_type_other}
                onChange={(e) => updateExtra('roof_type_other', e.target.value)}
                style={{ ...inputStyle, marginTop: 8 }}
                placeholder="Enter roof type"
              />
            )}
          </Labeled>

          <Labeled label="METER PHASE">
            <select
              value={extras.meter_phase_sel}
              onChange={(e) => updateExtra('meter_phase_sel', e.target.value)}
              style={inputStyle}
            >
              <option value="">Select</option>
              {METER_PHASE_OPTS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </Labeled>

          <Labeled label="ACCESS TO 2ND STOREY">
            <select
              value={
                extras.access_to_second_storey == null
                  ? ''
                  : extras.access_to_second_storey
                  ? '1'
                  : '0'
              }
              onChange={(e) =>
                updateExtra(
                  'access_to_second_storey',
                  e.target.value === '' ? null : e.target.value === '1',
                )
              }
              style={inputStyle}
            >
              <option value="">Select</option>
              <option value="1">Yes</option>
              <option value="0">No</option>
            </select>
          </Labeled>

          <Labeled label="ACCESS TO INVERTER">
            <select
              value={
                extras.access_to_inverter == null ? '' : extras.access_to_inverter ? '1' : '0'
              }
              onChange={(e) =>
                updateExtra(
                  'access_to_inverter',
                  e.target.value === '' ? null : e.target.value === '1',
                )
              }
              style={inputStyle}
            >
              <option value="">Select</option>
              <option value="1">Yes</option>
              <option value="0">No</option>
            </select>
          </Labeled>
        </FieldRow>
      </Section>

      <Section title="UTILITY INFORMATION">
        <FieldRow two>
          <Labeled label="PRE-APPROVAL REFERENCE NUMBER">
            <input
              type="text"
              value={extras.pre_approval_reference_no || ''}
              onChange={(e) => updateExtra('pre_approval_reference_no', e.target.value)}
              style={inputStyle}
            />
          </Labeled>

          <Labeled label="ENERGY RETAILER">
            <input
              type="text"
              value={extras.energy_retailer || ''}
              onChange={(e) => updateExtra('energy_retailer', e.target.value)}
              style={inputStyle}
            />
          </Labeled>

          <Labeled label="ENERGY DISTRIBUTOR">
            <input
              type="text"
              value={extras.energy_distributor || ''}
              onChange={(e) => updateExtra('energy_distributor', e.target.value)}
              style={inputStyle}
            />
          </Labeled>

          <Labeled label="SOLAR VICTORIA ELIGIBILITY">
            <select
              value={
                extras.solar_vic_eligibility == null
                  ? ''
                  : extras.solar_vic_eligibility
                  ? '1'
                  : '0'
              }
              onChange={(e) =>
                updateExtra(
                  'solar_vic_eligibility',
                  e.target.value === '' ? null : e.target.value === '1',
                )
              }
              style={inputStyle}
            >
              <option value="">Select</option>
              <option value="1">Eligible</option>
              <option value="0">Not eligible</option>
            </select>
          </Labeled>

          <Labeled label="NMI NUMBER">
            <input
              type="text"
              value={extras.nmi_number || ''}
              onChange={(e) => updateExtra('nmi_number', e.target.value)}
              style={inputStyle}
            />
          </Labeled>

          <Labeled label="METER NUMBER">
            <input
              type="text"
              value={extras.meter_number || ''}
              onChange={(e) => updateExtra('meter_number', e.target.value)}
              style={inputStyle}
            />
          </Labeled>
        </FieldRow>
      </Section>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button type="submit" form="lead-core-form" style={btnPrimary}>
          Save changes
        </button>
      </div>
    </div>
  );
}

const GRAY = '#E5E7EB';
const LABEL = { display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 4 };

const inputStyle = {
  width: '100%',
  border: `1px solid ${GRAY}`,
  borderRadius: 10,
  padding: '10px',
  outline: 'none',
  background: '#fff',
};

function Section({ title, children }) {
  return (
    <section style={{
      border: `1px solid ${GRAY}`,
      borderRadius: 12,
      padding: 12,
      // no background
    }}>
      <div style={{ fontWeight: 800, fontSize: 12, letterSpacing: 1, color: '#0F172A', marginBottom: 8 }}>
        {title}
      </div>
      {children}
    </section>
  );
}
function FieldRow({ two = false, children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: two ? '1fr 1fr' : '1fr', gap: 12 }}>
      {children}
    </div>
  );
}
function Labeled({ label, children }) {
  return (
    <div>
      <label style={LABEL}>{label}</label>
      {children}
    </div>
  );
}

const btnPrimary = {
  backgroundColor: '#1A7B7B',
  color: '#FFFFFF',
  padding: '10px 14px',
  borderRadius: 10,
  border: 'none',
  fontWeight: 700,
  letterSpacing: 0.2,
  cursor: 'pointer',
};