// components/leads/LeadDetailDetails.jsx — editable Details tab (core form + extras + footer actions)
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import LeadForm from './LeadForm.jsx';
import '../../styles/LeadDetailModal.css';
import {
  getCecBatteryBrands,
  getCecBatteryModels,
  getCecInverterDetails,
  getCecMeta,
  getCecInverterBrands,
  getCecInverterModels,
  getCecInverterSeries,
  getCecPvPanelModels,
  getCecPvPanelDetails,
  getCecPvPanelBrands,
  syncCecNow,
} from '../../services/api.js';
import { dbDatetimeToDatetimeLocalInput } from '../../utils/inspectionPrefillFromLead.js';

function formatDateTimeLocal(isoString) {
  const v = dbDatetimeToDatetimeLocalInput(isoString);
  return v ?? '';
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

function resolveApprovedOption(input, options) {
  const raw = String(input ?? '').trim();
  if (!raw) return '';
  const want = raw.toLowerCase();
  const list = Array.isArray(options) ? options : [];
  const exact = list.find((o) => String(o).trim().toLowerCase() === want);
  return exact ? String(exact).trim() : '';
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

  const inspectorId = lead?.inspector_id ?? lead?._raw?.inspector_id ?? '';

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
            inspector_id: inspectorId,
            sales_segment: (() => {
              const s = lead?.sales_segment ?? lead?._raw?.sales_segment;
              return s === 'b2c' || s === 'b2b' ? s : '';
            })(),
          }
        : null,
    [lead, email, phone, suburb, systemSizeKw, valueAmount, stage, siteInspectionDateIso, inspectorId],
  );

  const SYSTEM_TYPE_OPTS  = ['PV only', 'PV + Battery', 'Only Battery', 'Only EV Charger', 'PV + Battery + EV Charger', 'Battery + EV Charger','PV + EV Chargers'];
  const HOUSE_STOREY_OPTS = ['Single', 'Double', 'Triple', 'Other'];
  const ROOF_TYPE_OPTS    = ['Tin(Colorbond)', 'Tin(Kliplock)', 'Tile(Concrete)', 'Tile(Terracotta)', 'Flat', 'Other'];
  const METER_PHASE_OPTS  = ['Single', 'Double', 'Three']; 
  const ENERGY_DISTRIBUTOR_OPTS = ['AusNet', 'Powercor', 'CitiPower', 'United Energy', 'Jemena'];
  const splitForSelectOther = (value, options) => {
    if (!value) return { sel: '', other: '' };
    const found = options.find(o => o.toLowerCase() === String(value).trim().toLowerCase());
    if (found) return { sel: found, other: '' };
    return { sel: 'Other', other: String(value) };
  };

  const computeExtrasFromLead = (leadData) => {
    const { sel: sysSel, other: sysOther } = splitForSelectOther(
      leadData?.system_type ?? leadData?.systemType ?? leadData?._raw?.system_type ?? '',
      SYSTEM_TYPE_OPTS
    );

    const { sel: storeySel, other: storeyOther } = splitForSelectOther(
      leadData?.house_storey ?? leadData?.houseStorey ?? leadData?._raw?.house_storey ?? '',
      HOUSE_STOREY_OPTS
    );
    const { sel: roofSel, other: roofOther } = splitForSelectOther(
      leadData?.roof_type ?? leadData?.roofType ?? leadData?._raw?.roof_type ?? '',
      ROOF_TYPE_OPTS
    );

    const meterRaw = leadData?.meter_phase ?? leadData?.meterPhase ?? leadData?._raw?.meter_phase ?? '';
    const meterSel = METER_PHASE_OPTS.find(
      (opt) => opt.toLowerCase() === String(meterRaw).trim().toLowerCase()
    ) || '';

    return {
      system_type_sel: sysSel,
      system_type_other: sysOther,

      house_storey_sel: storeySel,
      house_storey_other: storeyOther,

      roof_type_sel: roofSel,
      roof_type_other: roofOther,

      meter_phase_sel: meterSel,

      access_to_second_storey: toBoolOrNull(
        leadData?.access_to_second_storey ??
          leadData?.accessToSecondStorey ??
          leadData?._raw?.access_to_second_storey ??
          null,
      ),
      access_to_inverter: toBoolOrNull(
        leadData?.access_to_inverter ??
          leadData?.accessToInverter ??
          leadData?._raw?.access_to_inverter ??
          null,
      ),
      pre_approval_reference_no:
        leadData?.pre_approval_reference_no ??
        leadData?.preApprovalReferenceNo ??
        leadData?._raw?.pre_approval_reference_no ??
        '',
      energy_retailer:
        leadData?.energy_retailer ??
        leadData?.energyRetailer ??
        leadData?._raw?.energy_retailer ??
        '',
      energy_distributor:
        leadData?.energy_distributor ??
        leadData?.energyDistributor ??
        leadData?._raw?.energy_distributor ??
        '',
      solar_vic_eligibility: toBoolOrNull(
        leadData?.solar_vic_eligibility ??
          leadData?.solarVicEligibility ??
          leadData?._raw?.solar_vic_eligibility ??
          null,
      ),
      nmi_number: leadData?.nmi_number ?? leadData?.nmiNumber ?? leadData?._raw?.nmi_number ?? '',
      meter_number:
        leadData?.meter_number ?? leadData?.meterNumber ?? leadData?._raw?.meter_number ?? '',

      // PV system details
      pv_system_size_kw:
        leadData?.pv_system_size_kw ??
        leadData?._raw?.pv_system_size_kw ??
        '',
      pv_inverter_size_kw:
        leadData?.pv_inverter_size_kw ??
        leadData?._raw?.pv_inverter_size_kw ??
        '',
      pv_inverter_brand:
        leadData?.pv_inverter_brand ??
        leadData?._raw?.pv_inverter_brand ??
        '',
      pv_inverter_model:
        lead?.pv_inverter_model ??
        lead?._raw?.pv_inverter_model ??
        '',
      pv_inverter_series:
        lead?.pv_inverter_series ??
        lead?._raw?.pv_inverter_series ??
        '',
      pv_inverter_power_kw:
        lead?.pv_inverter_power_kw ??
        lead?._raw?.pv_inverter_power_kw ??
        '',
      pv_inverter_quantity:
        lead?.pv_inverter_quantity ??
        lead?._raw?.pv_inverter_quantity ??
        '',
      pv_panel_brand:
        leadData?.pv_panel_brand ??
        leadData?._raw?.pv_panel_brand ??
        '',
      pv_panel_model:
        lead?.pv_panel_model ??
        lead?._raw?.pv_panel_model ??
        '',
      pv_panel_quantity:
        lead?.pv_panel_quantity ??
        lead?._raw?.pv_panel_quantity ??
        '',
      pv_panel_module_watts:
        leadData?.pv_panel_module_watts ??
        leadData?._raw?.pv_panel_module_watts ??
        '',

      // EV charger details
      ev_charger_brand:
        leadData?.ev_charger_brand ??
        leadData?._raw?.ev_charger_brand ??
        '',
      ev_charger_model:
        leadData?.ev_charger_model ??
        leadData?._raw?.ev_charger_model ??
        '',

      // Battery details
      battery_size_kwh:
        leadData?.battery_size_kwh ??
        leadData?._raw?.battery_size_kwh ??
        '',
      battery_brand:
        leadData?.battery_brand ??
        leadData?._raw?.battery_brand ??
        '',
      battery_model:
        leadData?.battery_model ??
        leadData?._raw?.battery_model ??
        '',
    };
  };

  // ----- New sections state -----
  const [extras, setExtras] = useState(() => computeExtrasFromLead(lead));

  useEffect(() => {
    setExtras(computeExtrasFromLead(lead));
  }, [lead]);

  const updateExtra = (key, value) =>
    setExtras((prev) => ({ ...prev, [key]: value }));

  const handleInverterBrandChange = useCallback((value) => {
    setExtras((prev) => {
      if ((prev.pv_inverter_brand || '') === value) {
        return { ...prev, pv_inverter_brand: value };
      }
      return {
        ...prev,
        pv_inverter_brand: value,
        pv_inverter_model: '',
        pv_inverter_series: '',
      };
    });
    setCecOptions((p) => ({
      ...p,
      inverterModels: [],
      inverterModelsForBrand: '',
      inverterSeries: [],
      inverterSeriesForBrandModel: '',
    }));
  }, []);

  const handleInverterModelChange = useCallback((value) => {
    setExtras((prev) => {
      if ((prev.pv_inverter_model || '') === value) {
        return { ...prev, pv_inverter_model: value };
      }
      return {
        ...prev,
        pv_inverter_model: value,
        pv_inverter_series: '',
      };
    });
    setCecOptions((p) => ({
      ...p,
      inverterSeries: [],
      inverterSeriesForBrandModel: '',
    }));
  }, []);

  const handlePanelBrandChange = useCallback((value) => {
    setExtras((prev) => {
      if ((prev.pv_panel_brand || '') === value) {
        return { ...prev, pv_panel_brand: value };
      }
      return {
        ...prev,
        pv_panel_brand: value,
        pv_panel_model: '',
        pv_panel_module_watts: '',
      };
    });
    setCecOptions((p) => ({
      ...p,
      pvPanelModels: [],
      pvPanelModelsForBrand: '',
    }));
  }, []);

  const handlePanelModelChange = useCallback((value) => {
    setExtras((prev) => {
      if ((prev.pv_panel_model || '') === value) {
        return { ...prev, pv_panel_model: value };
      }
      return {
        ...prev,
        pv_panel_model: value,
        pv_panel_module_watts: '',
      };
    });
  }, []);

  const handleBatteryBrandChange = useCallback((value) => {
    setExtras((prev) => {
      if ((prev.battery_brand || '') === value) {
        return { ...prev, battery_brand: value };
      }
      return {
        ...prev,
        battery_brand: value,
        battery_model: '',
      };
    });
    setCecOptions((p) => ({
      ...p,
      batteryModels: [],
      batteryModelsForBrand: '',
    }));
  }, []);

  // ----- CEC Approved products options (cached) -----
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
  const [syncingCec, setSyncingCec] = useState(false);
  const [cecSyncMessage, setCecSyncMessage] = useState('');
  const [cecLastUpdatedAt, setCecLastUpdatedAt] = useState('');

  const currentType = extras.system_type_sel || '';
  const hasPV = /PV/i.test(currentType);
  const hasBattery = /Battery/i.test(currentType);

  // Load brand lists lazily, only when needed by system type.
  useEffect(() => {
    let cancelled = false;
    async function run() {
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
    return () => {
      cancelled = true;
    };
  }, [hasPV, hasBattery]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const meta = await getCecMeta();
        if (cancelled) return;
        const updatedAt = meta?.data?.updatedAt || '';
        setCecLastUpdatedAt(updatedAt);
      } catch {
        if (cancelled) return;
        setCecLastUpdatedAt('');
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load battery models when brand changes (only for battery system types).
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!hasBattery) return;
      const brand = (extras.battery_brand || '').trim();
      if (!brand) {
        setCecOptions((p) => ({ ...p, batteryModels: [], batteryModelsForBrand: '' }));
        return;
      }
      if (cecOptions.batteryModelsForBrand && cecOptions.batteryModelsForBrand === brand) return;
      try {
        const models = await getCecBatteryModels(brand);
        if (cancelled) return;
        setCecOptions((p) => ({
          ...p,
          batteryModels: Array.isArray(models) ? models : [],
          batteryModelsForBrand: brand,
        }));
      } catch {
        if (cancelled) return;
        setCecOptions((p) => ({ ...p, batteryModels: [], batteryModelsForBrand: brand }));
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [hasBattery, extras.battery_brand, cecOptions.batteryModelsForBrand]);

  // Load PV panel models when panel brand changes.
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!hasPV) return;
      const brandInput = (extras.pv_panel_brand || '').trim();
      const approvedBrand = resolveApprovedOption(brandInput, cecOptions.pvPanelBrands);
      if (!approvedBrand) {
        setCecOptions((p) => ({ ...p, pvPanelModels: [], pvPanelModelsForBrand: '' }));
        return;
      }
      if (cecOptions.pvPanelModelsForBrand && cecOptions.pvPanelModelsForBrand === approvedBrand) return;
      try {
        const models = await getCecPvPanelModels(approvedBrand);
        if (cancelled) return;
        setCecOptions((p) => ({
          ...p,
          pvPanelModels: Array.isArray(models) ? models : [],
          pvPanelModelsForBrand: approvedBrand,
        }));
      } catch {
        if (cancelled) return;
        setCecOptions((p) => ({ ...p, pvPanelModels: [], pvPanelModelsForBrand: approvedBrand }));
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [hasPV, extras.pv_panel_brand, cecOptions.pvPanelBrands, cecOptions.pvPanelModelsForBrand]);

  // Auto-fill panel module watts from selected panel model when available.
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!hasPV) return;
      const brand = resolveApprovedOption(extras.pv_panel_brand, cecOptions.pvPanelBrands);
      const model = (extras.pv_panel_model || '').trim();
      if (!brand || !model) return;
      // Do not overwrite existing manual value.
      if (String(extras.pv_panel_module_watts || '').trim() !== '') return;
      try {
        const details = await getCecPvPanelDetails(brand, model);
        if (cancelled) return;
        if (details?.module_watts != null && String(details.module_watts).trim() !== '') {
          updateExtra('pv_panel_module_watts', String(details.module_watts));
        }
      } catch {
        // silent - keep manual entry behavior
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [hasPV, extras.pv_panel_brand, cecOptions.pvPanelBrands, extras.pv_panel_model, extras.pv_panel_module_watts]);

  // Auto-calculate PV system size (kW) from panel quantity * panel module watts.
  useEffect(() => {
    if (!hasPV) return;
    const qty = Number(extras.pv_panel_quantity);
    const watts = Number(extras.pv_panel_module_watts);
    if (!Number.isFinite(qty) || !Number.isFinite(watts) || qty <= 0 || watts <= 0) return;
    const kw = (qty * watts) / 1000;
    const next = String(Number(kw.toFixed(3)));
    if (String(extras.pv_system_size_kw || '') === next) return;
    updateExtra('pv_system_size_kw', next);
  }, [hasPV, extras.pv_panel_quantity, extras.pv_panel_module_watts, extras.pv_system_size_kw]);

  // Auto-calculate inverter size (kW) from inverter power * inverter quantity.
  useEffect(() => {
    if (!hasPV) return;
    const powerKw = Number(extras.pv_inverter_power_kw);
    const qty = Number(extras.pv_inverter_quantity);
    if (!Number.isFinite(powerKw) || !Number.isFinite(qty) || powerKw <= 0 || qty <= 0) return;
    const totalKw = powerKw * qty;
    const next = String(Number(totalKw.toFixed(3)));
    if (String(extras.pv_inverter_size_kw || '') === next) return;
    updateExtra('pv_inverter_size_kw', next);
  }, [hasPV, extras.pv_inverter_power_kw, extras.pv_inverter_quantity, extras.pv_inverter_size_kw]);

  // Load inverter models when inverter brand changes.
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!hasPV) return;
      const brand = (extras.pv_inverter_brand || '').trim();
      if (!brand) {
        setCecOptions((p) => ({
          ...p,
          inverterModels: [],
          inverterModelsForBrand: '',
          inverterSeries: [],
          inverterSeriesForBrandModel: '',
        }));
        return;
      }
      if (cecOptions.inverterModelsForBrand && cecOptions.inverterModelsForBrand === brand) return;
      try {
        const models = await getCecInverterModels(brand);
        if (cancelled) return;
        setCecOptions((p) => ({
          ...p,
          inverterModels: Array.isArray(models) ? models : [],
          inverterModelsForBrand: brand,
          inverterSeries: [],
          inverterSeriesForBrandModel: '',
        }));
      } catch {
        if (cancelled) return;
        setCecOptions((p) => ({
          ...p,
          inverterModels: [],
          inverterModelsForBrand: brand,
          inverterSeries: [],
          inverterSeriesForBrandModel: '',
        }));
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [hasPV, extras.pv_inverter_brand, cecOptions.inverterModelsForBrand]);

  // Load inverter series/details when inverter model changes.
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!hasPV) return;
      const brand = (extras.pv_inverter_brand || '').trim();
      const model = (extras.pv_inverter_model || '').trim();
      if (!brand || !model) {
        setCecOptions((p) => ({ ...p, inverterSeries: [], inverterSeriesForBrandModel: '' }));
        return;
      }
      const key = `${brand}::${model}`;
      if (cecOptions.inverterSeriesForBrandModel && cecOptions.inverterSeriesForBrandModel === key) return;

      try {
        const [seriesList, details] = await Promise.all([
          getCecInverterSeries(brand, model).catch(() => []),
          getCecInverterDetails(brand, model).catch(() => null),
        ]);
        if (cancelled) return;
        setCecOptions((p) => ({
          ...p,
          inverterSeries: Array.isArray(seriesList) ? seriesList : [],
          inverterSeriesForBrandModel: key,
        }));
        if (!extras.pv_inverter_series && details?.series) {
          updateExtra('pv_inverter_series', details.series);
        }
        if (!extras.pv_inverter_power_kw && details?.power_kw != null) {
          updateExtra('pv_inverter_power_kw', String(details.power_kw));
        }
      } catch {
        if (cancelled) return;
        setCecOptions((p) => ({ ...p, inverterSeries: [], inverterSeriesForBrandModel: key }));
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [
    hasPV,
    extras.pv_inverter_brand,
    extras.pv_inverter_model,
    extras.pv_inverter_series,
    extras.pv_inverter_power_kw,
    cecOptions.inverterSeriesForBrandModel,
  ]);

  /** After save: in-app result (success / error), not browser alert or top toast */
  const [resultDialog, setResultDialog] = useState(null);

  const closeResultDialog = useCallback(() => {
    setResultDialog(null);
  }, []);

  const handleSaveClick = useCallback(() => {
    const form = document.getElementById('lead-core-form');
    if (!form) return;
    if (typeof form.requestSubmit === 'function') {
      form.requestSubmit();
      return;
    }
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }, []);

  useEffect(() => {
    if (!resultDialog) return;
    const onKey = (e) => {
      if (e.key === 'Escape') closeResultDialog();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [resultDialog, closeResultDialog]);

  /** API / inputs may return numbers; `(n || '').trim` throws — coerce first. */
  const trimOrNull = (v) => {
    if (v == null || v === '') return null;
    const s = String(v).trim();
    return s || null;
  };

  const handleSubmit = async (corePayload) => {
    // SYSTEM TYPE
    const system_type =
      extras.system_type_sel === 'Other'
        ? trimOrNull(extras.system_type_other)
        : (extras.system_type_sel || null);

    // House Storey
    const house_storey =
      extras.house_storey_sel === 'Other'
        ? trimOrNull(extras.house_storey_other)
        : (extras.house_storey_sel || null);

    // Roof Type
    const roof_type =
      extras.roof_type_sel === 'Other'
        ? trimOrNull(extras.roof_type_other)
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

      pre_approval_reference_no: trimOrNull(extras.pre_approval_reference_no),
      energy_retailer: trimOrNull(extras.energy_retailer),
      energy_distributor: trimOrNull(extras.energy_distributor),

      solar_vic_eligibility:
        extras.solar_vic_eligibility == null ? null : !!extras.solar_vic_eligibility,

      nmi_number: trimOrNull(extras.nmi_number),
      meter_number: trimOrNull(extras.meter_number),

      // PV system details (numeric fields from DB must use trimOrNull)
      pv_system_size_kw: trimOrNull(extras.pv_system_size_kw),
      pv_inverter_size_kw: trimOrNull(extras.pv_inverter_size_kw),
      pv_inverter_brand: trimOrNull(extras.pv_inverter_brand),
      pv_inverter_model: trimOrNull(extras.pv_inverter_model),
      pv_inverter_series: trimOrNull(extras.pv_inverter_series),
      pv_inverter_power_kw: trimOrNull(extras.pv_inverter_power_kw),
      pv_inverter_quantity: trimOrNull(extras.pv_inverter_quantity),
      pv_panel_brand: trimOrNull(extras.pv_panel_brand),
      pv_panel_model: trimOrNull(extras.pv_panel_model),
      pv_panel_quantity: trimOrNull(extras.pv_panel_quantity),
      pv_panel_module_watts: trimOrNull(extras.pv_panel_module_watts),

      // EV charger details
      ev_charger_brand: trimOrNull(extras.ev_charger_brand),
      ev_charger_model: trimOrNull(extras.ev_charger_model),

      // Battery details
      battery_size_kwh: trimOrNull(extras.battery_size_kwh),
      battery_brand: trimOrNull(extras.battery_brand),
      battery_model: trimOrNull(extras.battery_model),
    };

    try {
      await onSubmit(merged);
      setResultDialog({ variant: 'success', message: 'Lead updated successfully.' });
    } catch (err) {
      setResultDialog({
        variant: 'error',
        message: err?.message || 'Failed to save changes.',
      });
    }
  };

  const runManualCecSync = async () => {
    if (syncingCec) return;
    setSyncingCec(true);
    setCecSyncMessage('');
    try {
      const [syncRes, pvPanelBrands, inverterBrands, batteryBrands, meta] = await Promise.all([
        syncCecNow({ force: true }),
        getCecPvPanelBrands().catch(() => []),
        getCecInverterBrands().catch(() => []),
        getCecBatteryBrands().catch(() => []),
        getCecMeta().catch(() => null),
      ]);

      setCecOptions((p) => ({
        ...p,
        pvPanelBrands: Array.isArray(pvPanelBrands) ? pvPanelBrands : p.pvPanelBrands,
        inverterBrands: Array.isArray(inverterBrands) ? inverterBrands : p.inverterBrands,
        batteryBrands: Array.isArray(batteryBrands) ? batteryBrands : p.batteryBrands,
      }));

      const updatedAt = meta?.data?.updatedAt || syncRes?.data?.updatedAt || '';
      setCecLastUpdatedAt(updatedAt);
      setCecSyncMessage('CEC approved products synced successfully.');
    } catch (err) {
      setCecSyncMessage(err?.message || 'CEC sync failed.');
    } finally {
      setSyncingCec(false);
    }
  };

  return (
    <div className="lead-detail-details" style={{ display: 'grid', gap: 16 }}>
      {resultDialog && (
        <div
          className="lead-save-confirm-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lead-result-dialog-title"
        >
          <button
            type="button"
            className="lead-save-confirm-backdrop"
            aria-label="Dismiss"
            onClick={closeResultDialog}
          />
          <div
            className={`lead-save-confirm-panel ${resultDialog.variant === 'success' ? 'lead-result-dialog-panel--success' : ''}`}
          >
            <h2
              id="lead-result-dialog-title"
              className={`lead-save-confirm-title ${resultDialog.variant === 'success' ? 'lead-result-dialog-title--success' : 'lead-result-dialog-title--error'}`}
            >
              {resultDialog.variant === 'success' ? 'Saved' : 'Could not save'}
            </h2>
            <p
              className={
                resultDialog.variant === 'error'
                  ? 'lead-save-confirm-error lead-result-dialog-message'
                  : 'lead-save-confirm-text lead-result-dialog-message'
              }
              role={resultDialog.variant === 'error' ? 'alert' : undefined}
            >
              {resultDialog.message}
            </p>
            <div className="lead-save-confirm-actions">
              <button
                type="button"
                className="lead-save-confirm-btn primary"
                onClick={closeResultDialog}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
      <LeadForm
        initialValues={initialValues}
        onSubmit={handleSubmit}
        onCancel={onBack}
        cancelLabel="Back to overview"
        title=""
        submitLabel="Save changes"
        embedded
        suppressInlineSuccess
        formId="lead-core-form"
        hideActions
      />

      <Section title="SYSTEM INFORMATION">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 10 }}>
          <div style={{ fontSize: 12, color: '#6b7280' }}>
            {cecLastUpdatedAt
              ? `CEC last sync: ${new Date(cecLastUpdatedAt).toLocaleString()}`
              : 'CEC last sync: not synced yet'}
          </div>
          <button
            type="button"
            onClick={runManualCecSync}
            disabled={syncingCec}
            style={{
              ...btnPrimary,
              padding: '8px 12px',
              opacity: syncingCec ? 0.7 : 1,
              cursor: syncingCec ? 'not-allowed' : 'pointer',
            }}
          >
            {syncingCec ? 'Syncing...' : 'Sync CEC'}
          </button>
        </div>
        {cecSyncMessage ? (
          <div style={{ fontSize: 12, color: /failed/i.test(cecSyncMessage) ? '#b91c1c' : '#065f46', marginBottom: 10 }}>
            {cecSyncMessage}
          </div>
        ) : null}
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

      {/* PV / EV / Battery detail sections, driven by system type */}
      {(() => {
        const type = extras.system_type_sel || '';
        const hasPV = /PV/i.test(type);
        const hasEV = /EV/i.test(type);
        const hasBattery = /Battery/i.test(type);

        return (
          <>
            {hasPV && (
              <Section title="PV SYSTEM DETAILS">
                <FieldRow two>
                  <Labeled label="SYSTEM SIZE (kW)">
                    <input
                      type="number"
                      step="0.01"
                      value={extras.pv_system_size_kw || ''}
                      onChange={(e) => updateExtra('pv_system_size_kw', e.target.value)}
                      style={inputStyle}
                    />
                  </Labeled>
                  <Labeled label="INVERTER SIZE (kW)">
                    <input
                      type="number"
                      step="0.01"
                      value={extras.pv_inverter_size_kw || ''}
                      onChange={(e) => updateExtra('pv_inverter_size_kw', e.target.value)}
                      style={inputStyle}
                    />
                  </Labeled>
                  <Labeled label="INVERTER BRAND">
                    <SuggestInput
                      value={extras.pv_inverter_brand || ''}
                      onChange={handleInverterBrandChange}
                      options={cecOptions.inverterBrands}
                      placeholder={cecOptions.loading ? 'Loading approved brands...' : 'Start typing'}
                    />
                  </Labeled>
                  <Labeled label="INVERTER MODEL">
                    <SuggestInput
                      value={extras.pv_inverter_model || ''}
                      onChange={handleInverterModelChange}
                      options={cecOptions.inverterModels}
                      placeholder={extras.pv_inverter_brand ? 'Start typing' : 'Select/enter inverter brand first'}
                    />
                  </Labeled>
                  <Labeled label="INVERTER SERIES">
                    <SuggestInput
                      value={extras.pv_inverter_series || ''}
                      onChange={(value) => updateExtra('pv_inverter_series', value)}
                      options={cecOptions.inverterSeries}
                      placeholder={extras.pv_inverter_model ? 'Start typing' : 'Select/enter inverter model first'}
                    />
                  </Labeled>
                  <Labeled label="INVERTER POWER (kW)">
                    <input
                      type="number"
                      step="0.01"
                      value={extras.pv_inverter_power_kw || ''}
                      onChange={(e) => updateExtra('pv_inverter_power_kw', e.target.value)}
                      style={inputStyle}
                    />
                  </Labeled>
                  <Labeled label="NUMBER OF INVERTER">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={extras.pv_inverter_quantity || ''}
                      onChange={(e) => updateExtra('pv_inverter_quantity', e.target.value)}
                      style={inputStyle}
                    />
                  </Labeled>
                  <Labeled label="PANEL BRAND">
                    <SuggestInput
                      value={extras.pv_panel_brand || ''}
                      onChange={handlePanelBrandChange}
                      options={cecOptions.pvPanelBrands}
                      placeholder={cecOptions.loading ? 'Loading approved brands...' : 'Start typing'}
                    />
                  </Labeled>
                  <Labeled label="PANEL MODEL">
                    <SuggestInput
                      value={extras.pv_panel_model || ''}
                      onChange={handlePanelModelChange}
                      options={cecOptions.pvPanelModels}
                      placeholder={extras.pv_panel_brand ? 'Start typing' : 'Select/enter panel brand first'}
                    />
                  </Labeled>
                  <Labeled label="QUANTITY OF PANEL">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={extras.pv_panel_quantity || ''}
                      onChange={(e) => updateExtra('pv_panel_quantity', e.target.value)}
                      style={inputStyle}
                    />
                  </Labeled>
                  <Labeled label="PANEL MODULE (WATTS)">
                    <input
                      type="number"
                      step="1"
                      value={extras.pv_panel_module_watts || ''}
                      onChange={(e) => updateExtra('pv_panel_module_watts', e.target.value)}
                      style={inputStyle}
                    />
                  </Labeled>
                </FieldRow>
              </Section>
            )}

            {hasEV && (
              <Section title="EV CHARGER DETAILS">
                <FieldRow two>
                  <Labeled label="EV CHARGER BRAND">
                    <input
                      type="text"
                      value={extras.ev_charger_brand || ''}
                      onChange={(e) => updateExtra('ev_charger_brand', e.target.value)}
                      style={inputStyle}
                    />
                  </Labeled>
                  <Labeled label="EV CHARGER MODEL">
                    <input
                      type="text"
                      value={extras.ev_charger_model || ''}
                      onChange={(e) => updateExtra('ev_charger_model', e.target.value)}
                      style={inputStyle}
                    />
                  </Labeled>
                </FieldRow>
              </Section>
            )}

            {hasBattery && (
              <Section title="BATTERY DETAILS">
                <FieldRow two>
                  <Labeled label="BATTERY SIZE (kWh)">
                    <input
                      type="number"
                      step="0.01"
                      value={extras.battery_size_kwh || ''}
                      onChange={(e) => updateExtra('battery_size_kwh', e.target.value)}
                      style={inputStyle}
                    />
                  </Labeled>
                  <Labeled label="BATTERY BRAND">
                    <SuggestInput
                      value={extras.battery_brand || ''}
                      onChange={handleBatteryBrandChange}
                      options={cecOptions.batteryBrands}
                      placeholder={cecOptions.loading ? 'Loading approved brands...' : 'Start typing'}
                    />
                  </Labeled>
                  <Labeled label="BATTERY MODEL">
                    <SuggestInput
                      value={extras.battery_model || ''}
                      onChange={(value) => updateExtra('battery_model', value)}
                      options={cecOptions.batteryModels}
                      placeholder={
                        extras.battery_brand
                          ? 'Start typing'
                          : 'Select/enter brand first'
                      }
                    />
                  </Labeled>
                </FieldRow>
              </Section>
            )}
          </>
        );
      })()}

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
            <select
              value={extras.energy_distributor || ''}
              onChange={(e) => updateExtra('energy_distributor', e.target.value)}
              style={inputStyle}
            >
              <option value="">Select</option>
              {ENERGY_DISTRIBUTOR_OPTS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
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
        <button type="button" onClick={handleSaveClick} style={btnPrimary}>
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

function SuggestInput({ value, onChange, options = [], placeholder = 'Start typing' }) {
  const [open, setOpen] = useState(false);
  const query = String(value || '').trim().toLowerCase();
  const matches = useMemo(() => {
    const all = Array.isArray(options) ? options : [];
    if (!query) return all;
    return all.filter((item) => String(item).toLowerCase().includes(query));
  }, [options, query]);

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 140)}
        style={inputStyle}
        placeholder={placeholder}
      />
      {open && matches.length > 0 ? (
        <div style={suggestMenuStyle}>
          {matches.map((option) => {
            const text = String(option);
            return (
              <button
                key={text}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(text);
                  setOpen(false);
                }}
                style={suggestItemStyle}
                title={text}
              >
                {text}
              </button>
            );
          })}
        </div>
      ) : null}
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

const suggestMenuStyle = {
  position: 'absolute',
  top: 'calc(100% + 6px)',
  left: 0,
  right: 0,
  zIndex: 40,
  background: '#fff',
  border: `1px solid ${GRAY}`,
  borderRadius: 10,
  boxShadow: '0 10px 24px rgba(15, 23, 42, 0.14)',
  maxHeight: 240,
  overflowY: 'auto',
  padding: 4,
};

const suggestItemStyle = {
  width: '100%',
  textAlign: 'left',
  background: 'transparent',
  border: 'none',
  borderRadius: 8,
  padding: '8px 10px',
  color: '#0f172a',
  cursor: 'pointer',
  fontSize: 13,
};