// src/components/projects/RetailerProjectCreatePanel.jsx
// Centered modal for scheduling/creating a Retailer Project.
// - Inline CSS only (no external stylesheet required)
// - Job Type-driven validation: Site Inspection → requires date & time; others → date only
// - Job Type → Stage mapping so the new card appears in the correct Kanban column

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  getCecBatteryBrands,
  getCecBatteryModels,
  getCecInverterBrands,
  getCecInverterDetails,
  getCecInverterModels,
  getCecInverterSeries,
  getCecPvPanelBrands,
  getCecPvPanelDetails,
  getCecPvPanelModels,
} from '../../services/api.js';

// Job types & mapping to Kanban stages
const JOB_TYPES = [
  { key: 'site_inspection', label: 'Site Inspection' },
  { key: 'stage_one', label: 'Stage One' },
  { key: 'stage_two', label: 'Stage Two' },
  { key: 'full_system', label: 'Full System' },
];
const JOB_TYPE_TO_STAGE = {
  site_inspection: 'site_inspection',
  stage_one: 'stage_one',
  stage_two: 'stage_two',
  full_system: 'full_system',
};

// Option lists for selects (adjust freely)
const CLIENT_TYPES = ['Residential', 'Commercial', 'Government', 'Other'];
const SYSTEM_TYPES = ['PV only', 'PV + Battery', 'Only Battery', 'Only EV Charger', 'PV + Battery + EV Charger', 'Battery + EV Charger', 'PV + EV Chargers'];
const HOUSE_STOREYS = ['Single', 'Double', 'Triple+'];
const ROOF_TYPES = ['Tile', 'Metal (Colorbond)', 'Concrete', 'Other'];
const METER_PHASES = ['Single Phase', 'Two Phase', 'Three Phase'];
const ACCESS_OPTIONS = ['Yes', 'No', 'Unknown'];

const ENERGY_DISTRIBUTOR_OPTS = ['AusNet', 'Powercor', 'CitiPower', 'United Energy', 'Jemena'];

export default function RetailerProjectCreatePanel({ visible, onClose, onCreate }) {
  // ---- Core state ----
  const [jobType, setJobType] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [locationUrl, setLocationUrl] = useState('');
  const [clientType, setClientType] = useState('');
  const [clientName, setClientName] = useState('');
  const [priceAud, setPriceAud] = useState('');

  const [systemType, setSystemType] = useState('');
  const [systemSizeKw, setSystemSizeKw] = useState('');
  const [houseStorey, setHouseStorey] = useState('');
  const [roofType, setRoofType] = useState('');
  const [meterPhase, setMeterPhase] = useState('');
  const [accessTo2Storey, setAccessTo2Storey] = useState('');
  const [accessToInverter, setAccessToInverter] = useState('');

  // PV / EV / Battery details (driven by systemType)
  const [pvInverterSizeKw, setPvInverterSizeKw] = useState('');
  const [pvInverterBrand, setPvInverterBrand] = useState('');
  const [pvInverterModel, setPvInverterModel] = useState('');
  const [pvInverterSeries, setPvInverterSeries] = useState('');
  const [pvInverterPowerKw, setPvInverterPowerKw] = useState('');
  const [pvInverterQuantity, setPvInverterQuantity] = useState('');
  const [pvPanelBrand, setPvPanelBrand] = useState('');
  const [pvPanelModel, setPvPanelModel] = useState('');
  const [pvPanelQuantity, setPvPanelQuantity] = useState('');
  const [pvPanelModuleWatts, setPvPanelModuleWatts] = useState('');

  const [evChargerBrand, setEvChargerBrand] = useState('');
  const [evChargerModel, setEvChargerModel] = useState('');

  const [batterySizeKwh, setBatterySizeKwh] = useState('');
  const [batteryBrand, setBatteryBrand] = useState('');
  const [batteryModel, setBatteryModel] = useState('');

  // Utility information
  const [preApprovalReferenceNo, setPreApprovalReferenceNo] = useState('');
  const [energyRetailer, setEnergyRetailer] = useState('');
  const [energyDistributor, setEnergyDistributor] = useState('');
  const [solarVicEligibility, setSolarVicEligibility] = useState(''); // '1' | '0' | ''
  const [nmiNumber, setNmiNumber] = useState('');
  const [meterNumber, setMeterNumber] = useState('');

  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [cecOptions, setCecOptions] = useState({
    pvPanelBrands: [],
    pvPanelModels: [],
    pvPanelModelsForBrand: '',
    inverterBrands: [],
    inverterModels: [],
    inverterModelsForBrand: '',
    inverterSeries: [],
    inverterSeriesForBrandModel: '',
    batteryBrands: [],
    batteryModels: [],
    batteryModelsForBrand: '',
    loading: false,
  });

  // Focus & dialog refs
  const firstFieldRef = useRef(null);
  const dialogRef = useRef(null);

  // ----- Helpers -----
  const requiresTime = jobType === 'site_inspection';
  const canSave = useMemo(() => {
    if (!customerName.trim() || !jobType || !date) return false;
    if (requiresTime && !time) return false;
    return !saving;
  }, [customerName, jobType, date, time, requiresTime, saving]);

  const sysTypeForCondition = systemType || '';
  const hasPV = /PV/i.test(sysTypeForCondition);
  const hasEV = /EV/i.test(sysTypeForCondition);
  const hasBattery = /Battery/i.test(sysTypeForCondition);

  // Reset when opening
  useEffect(() => {
    if (!visible) return;
    setJobType('');
    setDate('');
    setTime('');
    setCustomerName('');
    setCustomerEmail('');
    setCustomerContact('');
    setCustomerAddress('');
    setLocationUrl('');
    setClientType('');
    setClientName('');
    setPriceAud('');
    setSystemType('');
    setSystemSizeKw('');
    setHouseStorey('');
    setRoofType('');
    setMeterPhase('');
    setAccessTo2Storey('');
    setAccessToInverter('');

    setPvInverterSizeKw('');
    setPvInverterBrand('');
    setPvInverterModel('');
    setPvInverterSeries('');
    setPvInverterPowerKw('');
    setPvInverterQuantity('');
    setPvPanelBrand('');
    setPvPanelModel('');
    setPvPanelQuantity('');
    setPvPanelModuleWatts('');

    setEvChargerBrand('');
    setEvChargerModel('');

    setBatterySizeKwh('');
    setBatteryBrand('');
    setBatteryModel('');

    setPreApprovalReferenceNo('');
    setEnergyRetailer('');
    setEnergyDistributor('');
    setSolarVicEligibility('');
    setNmiNumber('');
    setMeterNumber('');
    setNotes('');
    setSaving(false);
    setError('');
    setTimeout(() => firstFieldRef.current?.focus(), 0);
  }, [visible]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!visible) return;
      if (!hasPV && !hasBattery) return;
      setCecOptions((p) => ({ ...p, loading: true }));
      try {
        const [pvPanelBrands, inverterBrands, batteryBrands] = await Promise.all([
          hasPV ? getCecPvPanelBrands().catch(() => []) : Promise.resolve([]),
          hasPV ? getCecInverterBrands().catch(() => []) : Promise.resolve([]),
          hasBattery ? getCecBatteryBrands().catch(() => []) : Promise.resolve([]),
        ]);
        if (cancelled) return;
        setCecOptions((p) => ({
          ...p,
          pvPanelBrands: pvPanelBrands.length ? pvPanelBrands : p.pvPanelBrands,
          inverterBrands: inverterBrands.length ? inverterBrands : p.inverterBrands,
          batteryBrands: batteryBrands.length ? batteryBrands : p.batteryBrands,
          loading: false,
        }));
      } catch {
        if (cancelled) return;
        setCecOptions((p) => ({ ...p, loading: false }));
      }
    }
    run();
    return () => { cancelled = true; };
  }, [visible, hasPV, hasBattery]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!visible || !hasPV) return;
      const brand = String(pvPanelBrand || '').trim();
      if (!brand) {
        setCecOptions((p) => ({ ...p, pvPanelModels: [], pvPanelModelsForBrand: '' }));
        return;
      }
      if (cecOptions.pvPanelModelsForBrand === brand) return;
      const models = await getCecPvPanelModels(brand).catch(() => []);
      if (cancelled) return;
      setCecOptions((p) => ({ ...p, pvPanelModels: Array.isArray(models) ? models : [], pvPanelModelsForBrand: brand }));
    }
    run();
    return () => { cancelled = true; };
  }, [visible, hasPV, pvPanelBrand, cecOptions.pvPanelModelsForBrand]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!visible || !hasPV) return;
      const brand = String(pvInverterBrand || '').trim();
      if (!brand) {
        setCecOptions((p) => ({ ...p, inverterModels: [], inverterModelsForBrand: '', inverterSeries: [], inverterSeriesForBrandModel: '' }));
        return;
      }
      if (cecOptions.inverterModelsForBrand === brand) return;
      const models = await getCecInverterModels(brand).catch(() => []);
      if (cancelled) return;
      setCecOptions((p) => ({ ...p, inverterModels: Array.isArray(models) ? models : [], inverterModelsForBrand: brand, inverterSeries: [], inverterSeriesForBrandModel: '' }));
    }
    run();
    return () => { cancelled = true; };
  }, [visible, hasPV, pvInverterBrand, cecOptions.inverterModelsForBrand]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!visible || !hasPV) return;
      const brand = String(pvInverterBrand || '').trim();
      const model = String(pvInverterModel || '').trim();
      if (!brand || !model) {
        setCecOptions((p) => ({ ...p, inverterSeries: [], inverterSeriesForBrandModel: '' }));
        return;
      }
      const key = `${brand}::${model}`;
      if (cecOptions.inverterSeriesForBrandModel === key) return;
      const [seriesList, details] = await Promise.all([
        getCecInverterSeries(brand, model).catch(() => []),
        getCecInverterDetails(brand, model).catch(() => null),
      ]);
      if (cancelled) return;
      setCecOptions((p) => ({ ...p, inverterSeries: Array.isArray(seriesList) ? seriesList : [], inverterSeriesForBrandModel: key }));
      if (!pvInverterSeries && details?.series) setPvInverterSeries(details.series);
      if (!pvInverterPowerKw && details?.power_kw != null) setPvInverterPowerKw(String(details.power_kw));
    }
    run();
    return () => { cancelled = true; };
  }, [visible, hasPV, pvInverterBrand, pvInverterModel, pvInverterSeries, pvInverterPowerKw, cecOptions.inverterSeriesForBrandModel]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!visible || !hasPV) return;
      const brand = String(pvPanelBrand || '').trim();
      const model = String(pvPanelModel || '').trim();
      if (!brand || !model) return;
      if (String(pvPanelModuleWatts || '').trim() !== '') return;
      const details = await getCecPvPanelDetails(brand, model).catch(() => null);
      if (cancelled) return;
      if (details?.module_watts != null) setPvPanelModuleWatts(String(details.module_watts));
    }
    run();
    return () => { cancelled = true; };
  }, [visible, hasPV, pvPanelBrand, pvPanelModel, pvPanelModuleWatts]);

  useEffect(() => {
    if (!visible || !hasPV) return;
    const qty = Number(pvPanelQuantity);
    const watts = Number(pvPanelModuleWatts);
    if (!Number.isFinite(qty) || !Number.isFinite(watts) || qty <= 0 || watts <= 0) return;
    const next = String(Number(((qty * watts) / 1000).toFixed(3)));
    if (String(systemSizeKw || '') === next) return;
    setSystemSizeKw(next);
  }, [visible, hasPV, pvPanelQuantity, pvPanelModuleWatts, systemSizeKw]);

  useEffect(() => {
    if (!visible || !hasPV) return;
    const power = Number(pvInverterPowerKw);
    const qty = Number(pvInverterQuantity);
    if (!Number.isFinite(power) || !Number.isFinite(qty) || power <= 0 || qty <= 0) return;
    const next = String(Number((power * qty).toFixed(3)));
    if (String(pvInverterSizeKw || '') === next) return;
    setPvInverterSizeKw(next);
  }, [visible, hasPV, pvInverterPowerKw, pvInverterQuantity, pvInverterSizeKw]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!visible || !hasBattery) return;
      const brand = String(batteryBrand || '').trim();
      if (!brand) {
        setCecOptions((p) => ({ ...p, batteryModels: [], batteryModelsForBrand: '' }));
        return;
      }
      if (cecOptions.batteryModelsForBrand === brand) return;
      const models = await getCecBatteryModels(brand).catch(() => []);
      if (cancelled) return;
      setCecOptions((p) => ({ ...p, batteryModels: Array.isArray(models) ? models : [], batteryModelsForBrand: brand }));
    }
    run();
    return () => { cancelled = true; };
  }, [visible, hasBattery, batteryBrand, cecOptions.batteryModelsForBrand]);

  // Lock body scroll while open
  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev || ''; };
  }, [visible]);

  // Escape + simple focus trap
  useEffect(() => {
    if (!visible) return;
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose?.();
      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [visible, onClose]);

  // Inline style system
  const s = {
    overlay: {
      position: 'fixed', inset: 0, zIndex: 2300,
      background: 'rgba(15,23,42,0.48)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    },
    card: {
      width: 920, maxWidth: '96vw', maxHeight: '86vh',
      display: 'flex', flexDirection: 'column',
      background: '#fff', border: '1px solid #D1FAE5', borderRadius: 14,
      boxShadow: '0 20px 55px rgba(2,6,23,0.28)', overflow: 'hidden',
      transform: 'translateY(6px)',
    },
    header: {
      position: 'sticky', top: 0, zIndex: 1,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 10, padding: '14px 18px', background: '#F0FDFA', borderBottom: '1px solid #CCFBF1',
    },
    title: { margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0F172A' },
    close: {
      border: '1px solid #CCFBF1', background: '#FFFFFF', color: '#0f172a',
      width: 28, height: 28, borderRadius: 8, cursor: 'pointer',
    },
    body: {
      padding: 18, overflow: 'auto', display: 'grid', gap: 14, background: '#FCFFFE',
    },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
    grid2Compact: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'end' },
    group: { border: '1px solid #D1FAE5', borderRadius: 12, padding: 12, background: '#FFFFFF' },
    groupTitle: { fontWeight: 700, color: '#0f172a', marginBottom: 10 },
    field: { display: 'flex', flexDirection: 'column', gap: 6 },
    label: { fontWeight: 600, color: '#0f172a', fontSize: 13 },
    input: {
      border: '1.5px solid #4DB8A8', borderRadius: 12, padding: '10px 12px',
      fontSize: 14, color: '#0f172a', outline: 'none',
      background: '#FFFFFF',
    },
    select: {
      border: '1.5px solid #4DB8A8', borderRadius: 12, padding: '10px 12px',
      fontSize: 14, color: '#0f172a', outline: 'none', background: '#fff',
    },
    textarea: {
      border: '1.5px solid #4DB8A8', borderRadius: 12, padding: '10px 12px',
      fontSize: 14, color: '#0f172a', outline: 'none', resize: 'vertical', minHeight: 84,
    },
    footer: {
      display: 'flex', justifyContent: 'flex-end', gap: 12,
      padding: '12px 18px', background: '#F8FAFC', borderTop: '1px solid #E2E8F0',
    },
    cancelBtn: {
      background: '#fff', border: '1px solid #e2e8f0', color: '#0f172a',
      padding: '10px 14px', borderRadius: 10, fontWeight: 600, cursor: 'pointer',
    },
    saveBtn: {
      background: '#1A7B7B', border: '1px solid #1A7B7B', color: '#fff',
      padding: '10px 14px', borderRadius: 10, fontWeight: 700, cursor: 'pointer',
    },
    rowGap: { display: 'grid', gap: 12 },
    hint: { fontSize: 12, color: '#64748b' },
  };

  // Create handler (builds payload for backend)
  async function handleCreate() {
    try {
      setSaving(true); setError('');
      const stage = JOB_TYPE_TO_STAGE[jobType] || 'new';
      const payload = {
        customer_name: customerName.trim(),
        job_type: jobType,
        scheduled_date: date || null,
        scheduled_time: requiresTime ? time || null : null,
        stage, // server also validates this
        // Extended fields
        customer_email: customerEmail || null,
        customer_contact: customerContact || null,
        address: customerAddress || null,
        suburb: null,
        location_url: locationUrl || null,
        client_type: clientType || null,
        client_name: clientName || null,
        value_amount: priceAud ? Number(priceAud) : null,
        system_type: systemType || null,
        system_size_kw: hasPV && systemSizeKw ? Number(systemSizeKw) : null,
        pv_system_size_kw: hasPV && systemSizeKw ? Number(systemSizeKw) : null,

        pv_inverter_size_kw: hasPV && pvInverterSizeKw ? Number(pvInverterSizeKw) : null,
        pv_inverter_brand: hasPV ? (pvInverterBrand || null) : null,
        pv_inverter_model: hasPV ? (pvInverterModel || null) : null,
        pv_inverter_series: hasPV ? (pvInverterSeries || null) : null,
        pv_inverter_power_kw: hasPV && pvInverterPowerKw ? Number(pvInverterPowerKw) : null,
        pv_inverter_quantity: hasPV && pvInverterQuantity ? Number(pvInverterQuantity) : null,
        pv_panel_brand: hasPV ? (pvPanelBrand || null) : null,
        pv_panel_model: hasPV ? (pvPanelModel || null) : null,
        pv_panel_quantity: hasPV && pvPanelQuantity ? Number(pvPanelQuantity) : null,
        pv_panel_module_watts: hasPV && pvPanelModuleWatts ? Number(pvPanelModuleWatts) : null,

        ev_charger_brand: hasEV ? (evChargerBrand || null) : null,
        ev_charger_model: hasEV ? (evChargerModel || null) : null,

        battery_size_kwh: hasBattery && batterySizeKwh ? Number(batterySizeKwh) : null,
        battery_brand: hasBattery ? (batteryBrand || null) : null,
        battery_model: hasBattery ? (batteryModel || null) : null,

        pre_approval_reference_no: preApprovalReferenceNo || null,
        energy_retailer: energyRetailer || null,
        energy_distributor: energyDistributor || null,
        solar_vic_eligibility:
          solarVicEligibility === '' ? null : solarVicEligibility === '1' ? 1 : 0,
        nmi_number: nmiNumber || null,
        meter_number: meterNumber || null,
        house_storey: houseStorey || null,
        roof_type: roofType || null,
        meter_phase: meterPhase || null,
        access_to_two_storey: accessTo2Storey || null,
        access_to_inverter: accessToInverter || null,
        notes: notes || null,
      };
      await onCreate?.(payload);
    } catch (err) {
      setError(err.message || 'Failed to create retailer project');
      setSaving(false);
      return;
    }
    setSaving(false);
    onClose?.();
  }

  if (!visible || typeof document === 'undefined') return null;

  return createPortal(
    <div style={s.overlay} role="dialog" aria-modal="true" aria-labelledby="create-retailer-project-title" onClick={() => onClose?.()}>
      <div ref={dialogRef} style={s.card} role="document" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={s.header}>
          <h2 id="create-retailer-project-title" style={s.title}>Add New Project</h2>
          <button type="button" style={s.close} onClick={() => onClose?.()} aria-label="Close">×</button>
        </div>

        {/* Body */}
        <div style={s.body}>
          {error && (
            <div style={{ padding: 10, borderRadius: 10, background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e' }}>
              {error}
            </div>
          )}

          {/* Row 1: Project Code (readonly hint) + Job Type */}
          <div style={s.grid2}>
            <label style={s.field}>
              <span style={s.label}>Project Code</span>
              <input style={s.input} placeholder="Will be auto-generated (e.g. PRJ-22)" disabled />
              <small style={s.hint}>The code is generated after creation.</small>
            </label>

            <label style={s.field}>
              <span style={s.label}>Job Type *</span>
              <select style={s.select} value={jobType} onChange={(e) => setJobType(e.target.value)}>
                <option value="">Select job type</option>
                {JOB_TYPES.map(j => <option key={j.key} value={j.key}>{j.label}</option>)}
              </select>
            </label>
          </div>

          {/* Row 2: Schedule section placed IMMEDIATELY under Job Type */}
          <div style={requiresTime ? s.grid2Compact : s.rowGap}>
            <label style={s.field}>
              <span style={s.label}>Schedule Date *</span>
              <input style={s.input} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            {requiresTime && (
              <label style={s.field}>
                <span style={s.label}>Schedule Time *</span>
                <input style={s.input} type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </label>
            )}
          </div>

          {/* Row 3: Customer Name + Email */}
          <div style={s.grid2}>
            <label style={s.field}>
              <span style={s.label}>Customer Name *</span>
              <input ref={firstFieldRef} style={s.input} value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Enter customer name" />
            </label>
            <label style={s.field}>
              <span style={s.label}>Customer Email</span>
              <input style={s.input} type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="Enter customer email" />
            </label>
          </div>

          {/* Row 4: Contact + Address */}
          <div style={s.grid2}>
            <label style={s.field}>
              <span style={s.label}>Customer Contact</span>
              <input style={s.input} value={customerContact} onChange={(e) => setCustomerContact(e.target.value)} placeholder="Enter contact number" />
            </label>
            <label style={s.field}>
              <span style={s.label}>Customer Address</span>
              <input style={s.input} value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} placeholder="Enter address" />
            </label>
          </div>

          {/* Row 5: Location URL + Client Type */}
          <div style={s.grid2}>
            <label style={s.field}>
              <span style={s.label}>Location (Google Maps)</span>
              <input style={s.input} value={locationUrl} onChange={(e) => setLocationUrl(e.target.value)} placeholder="Paste Google Maps link or add" />
            </label>
            <label style={s.field}>
              <span style={s.label}>Client Type</span>
              <select style={s.select} value={clientType} onChange={(e) => setClientType(e.target.value)}>
                <option value="">Select client type</option>
                {CLIENT_TYPES.map(sv => <option key={sv} value={sv}>{sv}</option>)}
              </select>
            </label>
          </div>

          {/* Row 6: Client Name + Price */}
          <div style={s.grid2}>
            <label style={s.field}>
              <span style={s.label}>Client Name</span>
              <input style={s.input} value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Enter client name" />
            </label>
            <label style={s.field}>
              <span style={s.label}>Price (AUD)</span>
              <input style={s.input} type="number" min="0" step="0.01" value={priceAud} onChange={(e) => setPriceAud(e.target.value)} placeholder="e.g., 8500" />
            </label>
          </div>

          {/* Row 7: System Type */}
          <label style={s.field}>
            <span style={s.label}>System Type</span>
            <select style={s.select} value={systemType} onChange={(e) => setSystemType(e.target.value)}>
              <option value="">Select system type</option>
              {SYSTEM_TYPES.map(sv => <option key={sv} value={sv}>{sv}</option>)}
            </select>
          </label>

          {/* PV / EV / Battery driven fields */}
          {hasPV && (
            <div style={s.group}>
              <div style={s.groupTitle}>PV System Details</div>
              <div style={s.grid2}>
                <label style={s.field}>
                  <span style={s.label}>System Size (kW)</span>
                  <input
                    style={s.input}
                    type="number"
                    min="0"
                    step="0.01"
                    value={systemSizeKw}
                    onChange={(e) => setSystemSizeKw(e.target.value)}
                  />
                </label>
                <label style={s.field}>
                  <span style={s.label}>Inverter Size (kW)</span>
                  <input
                    style={s.input}
                    type="number"
                    min="0"
                    step="0.01"
                    value={pvInverterSizeKw}
                    onChange={(e) => setPvInverterSizeKw(e.target.value)}
                  />
                </label>
              </div>
              <div style={s.grid2}>
                <label style={s.field}>
                  <span style={s.label}>Inverter Brand</span>
                  <input
                    style={s.input}
                    type="text"
                    list="cec-rpcp-inverter-brands"
                    value={pvInverterBrand}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value !== pvInverterBrand) {
                        setPvInverterModel('');
                        setPvInverterSeries('');
                        setCecOptions((p) => ({
                          ...p,
                          inverterModels: [],
                          inverterModelsForBrand: '',
                          inverterSeries: [],
                          inverterSeriesForBrandModel: '',
                        }));
                      }
                      setPvInverterBrand(value);
                    }}
                  />
                </label>
                <label style={s.field}>
                  <span style={s.label}>Inverter Model</span>
                  <input
                    style={s.input}
                    type="text"
                    list="cec-rpcp-inverter-models"
                    value={pvInverterModel}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value !== pvInverterModel) {
                        setPvInverterSeries('');
                        setCecOptions((p) => ({
                          ...p,
                          inverterSeries: [],
                          inverterSeriesForBrandModel: '',
                        }));
                      }
                      setPvInverterModel(value);
                    }}
                  />
                </label>
              </div>
              <div style={s.grid2}>
                <label style={s.field}>
                  <span style={s.label}>Inverter Series</span>
                  <input
                    style={s.input}
                    type="text"
                    list="cec-rpcp-inverter-series"
                    value={pvInverterSeries}
                    onChange={(e) => setPvInverterSeries(e.target.value)}
                  />
                </label>
                <label style={s.field}>
                  <span style={s.label}>Inverter Power (kW)</span>
                  <input
                    style={s.input}
                    type="number"
                    min="0"
                    step="0.01"
                    value={pvInverterPowerKw}
                    onChange={(e) => setPvInverterPowerKw(e.target.value)}
                  />
                </label>
              </div>
              <div style={s.grid2}>
                <label style={s.field}>
                  <span style={s.label}>Number of Inverter</span>
                  <input
                    style={s.input}
                    type="number"
                    min="0"
                    step="1"
                    value={pvInverterQuantity}
                    onChange={(e) => setPvInverterQuantity(e.target.value)}
                  />
                </label>
                <label style={s.field}>
                  <span style={s.label}>Panel Brand</span>
                  <input
                    style={s.input}
                    type="text"
                    list="cec-rpcp-panel-brands"
                    value={pvPanelBrand}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value !== pvPanelBrand) {
                        setPvPanelModel('');
                        setPvPanelModuleWatts('');
                        setCecOptions((p) => ({
                          ...p,
                          pvPanelModels: [],
                          pvPanelModelsForBrand: '',
                        }));
                      }
                      setPvPanelBrand(value);
                    }}
                  />
                </label>
              </div>
              <div style={s.grid2}>
                <label style={s.field}>
                  <span style={s.label}>Panel Model</span>
                  <input
                    style={s.input}
                    type="text"
                    list="cec-rpcp-panel-models"
                    value={pvPanelModel}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value !== pvPanelModel) {
                        setPvPanelModuleWatts('');
                      }
                      setPvPanelModel(value);
                    }}
                  />
                </label>
                <label style={s.field}>
                  <span style={s.label}>Quantity of Panel</span>
                  <input
                    style={s.input}
                    type="number"
                    min="0"
                    step="1"
                    value={pvPanelQuantity}
                    onChange={(e) => setPvPanelQuantity(e.target.value)}
                  />
                </label>
                <label style={s.field}>
                  <span style={s.label}>Panel Module (Watts)</span>
                  <input
                    style={s.input}
                    type="number"
                    min="0"
                    step="1"
                    value={pvPanelModuleWatts}
                    onChange={(e) => setPvPanelModuleWatts(e.target.value)}
                  />
                </label>
              </div>
            </div>
          )}

          {hasEV && (
            <div style={s.group}>
              <div style={s.groupTitle}>EV Charger Details</div>
              <div style={s.grid2}>
                <label style={s.field}>
                  <span style={s.label}>EV Charger Brand</span>
                  <input
                    style={s.input}
                    type="text"
                    value={evChargerBrand}
                    onChange={(e) => setEvChargerBrand(e.target.value)}
                  />
                </label>
                <label style={s.field}>
                  <span style={s.label}>EV Charger Model</span>
                  <input
                    style={s.input}
                    type="text"
                    value={evChargerModel}
                    onChange={(e) => setEvChargerModel(e.target.value)}
                  />
                </label>
              </div>
            </div>
          )}

          {hasBattery && (
            <div style={s.group}>
              <div style={s.groupTitle}>Battery Details</div>
              <div style={s.grid2}>
                <label style={s.field}>
                  <span style={s.label}>Battery Size (kWh)</span>
                  <input
                    style={s.input}
                    type="number"
                    min="0"
                    step="0.01"
                    value={batterySizeKwh}
                    onChange={(e) => setBatterySizeKwh(e.target.value)}
                  />
                </label>
                <label style={s.field}>
                  <span style={s.label}>Battery Brand</span>
                  <input
                    style={s.input}
                    type="text"
                    list="cec-rpcp-battery-brands"
                    value={batteryBrand}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value !== batteryBrand) {
                        setBatteryModel('');
                        setCecOptions((p) => ({
                          ...p,
                          batteryModels: [],
                          batteryModelsForBrand: '',
                        }));
                      }
                      setBatteryBrand(value);
                    }}
                  />
                </label>
              </div>
              <label style={s.field}>
                <span style={s.label}>Battery Model</span>
                <input
                  style={s.input}
                  type="text"
                  list="cec-rpcp-battery-models"
                  value={batteryModel}
                  onChange={(e) => setBatteryModel(e.target.value)}
                />
              </label>
            </div>
          )}

          <datalist id="cec-rpcp-panel-brands">
            {cecOptions.pvPanelBrands.map((v) => <option key={v} value={v} />)}
          </datalist>
          <datalist id="cec-rpcp-panel-models">
            {cecOptions.pvPanelModels.map((v) => <option key={v} value={v} />)}
          </datalist>
          <datalist id="cec-rpcp-inverter-brands">
            {cecOptions.inverterBrands.map((v) => <option key={v} value={v} />)}
          </datalist>
          <datalist id="cec-rpcp-inverter-models">
            {cecOptions.inverterModels.map((v) => <option key={v} value={v} />)}
          </datalist>
          <datalist id="cec-rpcp-inverter-series">
            {cecOptions.inverterSeries.map((v) => <option key={v} value={v} />)}
          </datalist>
          <datalist id="cec-rpcp-battery-brands">
            {cecOptions.batteryBrands.map((v) => <option key={v} value={v} />)}
          </datalist>
          <datalist id="cec-rpcp-battery-models">
            {cecOptions.batteryModels.map((v) => <option key={v} value={v} />)}
          </datalist>

          {/* Property Information */}
          <div style={s.group}>
            <div style={s.groupTitle}>Property Information</div>

            <div style={s.grid2}>
              <label style={s.field}>
                <span style={s.label}>House Storey</span>
                <select style={s.select} value={houseStorey} onChange={(e) => setHouseStorey(e.target.value)}>
                  <option value="">Select</option>
                  {HOUSE_STOREYS.map(sv => <option key={sv} value={sv}>{sv}</option>)}
                </select>
              </label>

              <label style={s.field}>
                <span style={s.label}>Roof Type</span>
                <select style={s.select} value={roofType} onChange={(e) => setRoofType(e.target.value)}>
                  <option value="">Select</option>
                  {ROOF_TYPES.map(sv => <option key={sv} value={sv}>{sv}</option>)}
                </select>
              </label>
            </div>

            <div style={s.grid2}>
              <label style={s.field}>
                <span style={s.label}>Meter Phase</span>
                <select style={s.select} value={meterPhase} onChange={(e) => setMeterPhase(e.target.value)}>
                  <option value="">Select</option>
                  {METER_PHASES.map(sv => <option key={sv} value={sv}>{sv}</option>)}
                </select>
              </label>

              <label style={s.field}>
                <span style={s.label}>Access to 2 Storey</span>
                <select style={s.select} value={accessTo2Storey} onChange={(e) => setAccessTo2Storey(e.target.value)}>
                  <option value="">Select</option>
                  {ACCESS_OPTIONS.map(sv => <option key={sv} value={sv}>{sv}</option>)}
                </select>
              </label>
            </div>

            <label style={s.field}>
              <span style={s.label}>Access to Inverter</span>
              <select style={s.select} value={accessToInverter} onChange={(e) => setAccessToInverter(e.target.value)}>
                <option value="">Select</option>
                {ACCESS_OPTIONS.map(sv => <option key={sv} value={sv}>{sv}</option>)}
              </select>
            </label>
          </div>

          {/* Utility Information */}
          <div style={s.group}>
            <div style={s.groupTitle}>Utility Information</div>
            <div style={s.grid2}>
              <label style={s.field}>
                <span style={s.label}>Pre-Approval Reference Number</span>
                <input
                  style={s.input}
                  type="text"
                  value={preApprovalReferenceNo}
                  onChange={(e) => setPreApprovalReferenceNo(e.target.value)}
                />
              </label>
              <label style={s.field}>
                <span style={s.label}>Energy Retailer</span>
                <input
                  style={s.input}
                  type="text"
                  value={energyRetailer}
                  onChange={(e) => setEnergyRetailer(e.target.value)}
                />
              </label>
            </div>

            <div style={s.grid2}>
              <label style={s.field}>
                <span style={s.label}>Energy Distributor</span>
                <select style={s.select} value={energyDistributor} onChange={(e) => setEnergyDistributor(e.target.value)}>
                  <option value="">Select</option>
                  {ENERGY_DISTRIBUTOR_OPTS.map((sv) => (
                    <option key={sv} value={sv}>{sv}</option>
                  ))}
                </select>
              </label>
              <label style={s.field}>
                <span style={s.label}>Solar Victoria Eligibility</span>
                <select style={s.select} value={solarVicEligibility} onChange={(e) => setSolarVicEligibility(e.target.value)}>
                  <option value="">Select</option>
                  <option value="1">Eligible</option>
                  <option value="0">Not eligible</option>
                </select>
              </label>
            </div>

            <div style={s.grid2}>
              <label style={s.field}>
                <span style={s.label}>NMI Number</span>
                <input style={s.input} type="text" value={nmiNumber} onChange={(e) => setNmiNumber(e.target.value)} />
              </label>
              <label style={s.field}>
                <span style={s.label}>Meter Number</span>
                <input style={s.input} type="text" value={meterNumber} onChange={(e) => setMeterNumber(e.target.value)} />
              </label>
            </div>
          </div>

          {/* Notes */}
          <label style={s.field}>
            <span style={s.label}>Notes</span>
            <textarea style={s.textarea} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add any additional notes" />
          </label>
        </div>

        {/* Footer */}
        <div style={s.footer}>
          <button type="button" style={s.cancelBtn} onClick={() => onClose?.()}>Cancel</button>
          <button type="button" style={{ ...s.saveBtn, opacity: canSave ? 1 : 0.6, cursor: canSave ? 'pointer' : 'not-allowed' }} disabled={!canSave} onClick={handleCreate}>
            {saving ? 'Creating…' : '+ Add New Project'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}