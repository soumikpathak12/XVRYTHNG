// components/leads/LeadDetailOverview.jsx
import React, { useState } from 'react';
import LeadDetailDetails from './LeadDetailDetails.jsx';

// Icons
function IconPhone(props) { return <svg width="20" height="20" {...props} fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2c-3-.5-6.1-2.1-8.6-3.07a19.5 19.5 0 0 1-6-6C3.7 9.3 2.1 6.1 1.6 3.14A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.4 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c1 .3 2 .6 2.8.7A2 2 0 0 1 22 16.9z"/></svg>; }
function IconEmail(props) { return <svg width="20" height="20" {...props} fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>; }
function IconLocation(props) { return <svg width="20" height="20" {...props} fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>; }
function IconLightning(props) { return <svg width="20" height="20" {...props} fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>; }
function IconDollar(props) { return <svg width="20" height="20" {...props} fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>; }
function IconHome(props) { return <svg width="20" height="20" {...props} fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9.5L12 3l9 6.5V21H3z"/></svg>; }
function IconRoof(props) { return <svg width="20" height="20" {...props} fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12l9-8 9 8"/><path d="M4 10v10h16V10"/></svg>; }
function IconPower(props) { return <svg width="20" height="20" {...props} fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/></svg>; }

export default function LeadDetailOverview({ lead, onEdit }) {
  const [showForm, setShowForm] = useState(false);

  if (showForm) {
    return (
      <div className="lead-detail-overview">
        <LeadDetailDetails
          lead={lead}
          onSubmit={async (payload) => { await onEdit(payload); setShowForm(false); }}
        />
        <button className="lead-detail-overview-back" onClick={() => setShowForm(false)}>← Back to overview</button>
      </div>
    );
  }

  const v = (x) => (!x && x !== 0 ? "—" : x);

  const phone  = v(lead?.phone);
  const email  = v(lead?.email);
  const suburb = v(lead?.suburb);

  const systemSizeKw = lead?.system_size_kw ? `${lead.system_size_kw} kW` : "—";
  const valueAmount  = lead?.value_amount ? `$${Number(lead.value_amount).toLocaleString()}` : "—";

  // New fields (compact)
  const fields = [
    { label: "SYSTEM TYPE", icon: <IconLightning />, value: v(lead?.system_type) },
    { label: "HOUSE STOREY", icon: <IconHome />, value: v(lead?.house_storey) },
    { label: "ROOF TYPE", icon: <IconRoof />, value: v(lead?.roof_type) },
    { label: "METER PHASE", icon: <IconPower />, value: v(lead?.meter_phase) },
    { label: "ACCESS 2ND STOREY", icon: <IconPower />, value: lead?.access_to_second_storey == null ? "—" : lead.access_to_second_storey ? "Yes" : "No" },
    { label: "ACCESS TO INVERTER", icon: <IconPower />, value: lead?.access_to_inverter == null ? "—" : lead.access_to_inverter ? "Yes" : "No" },
    { label: "PRE‑APPROVAL REF", icon: <IconLightning />, value: v(lead?.pre_approval_reference_no) },
    { label: "ENERGY RETAILER", icon: <IconLightning />, value: v(lead?.energy_retailer) },
    { label: "ENERGY DISTRIBUTOR", icon: <IconLightning />, value: v(lead?.energy_distributor) },
    { label: "SOLAR VIC ELIGIBILITY", icon: <IconLightning />, value: lead?.solar_vic_eligibility == null ? "—" : lead.solar_vic_eligibility ? "Eligible" : "Not eligible" },
    { label: "NMI NUMBER", icon: <IconLightning />, value: v(lead?.nmi_number) },
    { label: "METER NUMBER", icon: <IconLightning />, value: v(lead?.meter_number) }
  ];

  return (
    <div className="lead-detail-overview">

      <div className="lead-detail-overview-grid">

        {/* LEFT: CUSTOMER CONTACT */}
        <section className="lead-detail-overview-section">
          <h3 className="lead-detail-section-title">CUSTOMER CONTACT</h3>

          <div className="lead-detail-contact-cards">
            <div className="lead-detail-contact-card">
              <div className="lead-detail-contact-icon"><IconPhone /></div>
              <div><span className="lead-detail-contact-label">PHONE</span><span className="lead-detail-contact-value">{phone}</span></div>
            </div>

            <div className="lead-detail-contact-card">
              <div className="lead-detail-contact-icon"><IconEmail /></div>
              <div><span className="lead-detail-contact-label">EMAIL</span><span className="lead-detail-contact-value">{email}</span></div>
            </div>

            <div className="lead-detail-contact-card">
              <div className="lead-detail-contact-icon"><IconLocation /></div>
              <div><span className="lead-detail-contact-label">ADDRESS</span><span className="lead-detail-contact-value">{suburb}</span></div>
            </div>
          </div>
        </section>

        {/* RIGHT: PROJECT OVERVIEW */}
        <section className="lead-detail-overview-section">
          <h3 className="lead-detail-section-title">PROJECT OVERVIEW</h3>

          <div className="lead-detail-project-cards">
            <div className="lead-detail-project-card">
              <IconLightning className="lead-detail-project-icon" />
              <span className="lead-detail-project-label">SYSTEM SIZE</span>
              <span className="lead-detail-project-value">{systemSizeKw}</span>
            </div>

            <div className="lead-detail-project-card">
              <IconDollar className="lead-detail-project-icon" />
              <span className="lead-detail-project-label">EST. VALUE</span>
              <span className="lead-detail-project-value">{valueAmount}</span>
            </div>
          </div>
        </section>
      </div>

      <section className="lead-detail-overview-section" style={{ marginTop: 20 }}>
        <h3 className="lead-detail-section-title">PROPERTY INFORMATION</h3>

        <div
          className="lead-detail-big-card"
          style={{
            background: "#F5F8FA",
            padding: 18,
            borderRadius: 12,
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16
          }}
        >
          {fields.map((f, i) => (
            <div key={i} style={{}}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#087E8B" }}>
                {f.icon}
                <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.8 }}>{f.label}</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>
                {f.value}
              </div>
            </div>
          ))}
        </div>
      </section>

      <button type="button" className="lead-detail-edit-btn" onClick={() => setShowForm(true)}>
        Edit details
      </button>
    </div>
  );
}