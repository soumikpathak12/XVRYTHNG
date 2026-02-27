// frontend/src/pages/admin/AdminTemplatesPage.jsx
import React, { useEffect, useState } from 'react';
import {
  getCompanyInspectionTemplates,
  saveInspectionTemplate,
  publishInspectionTemplate,
  deleteInspectionTemplate
} from '../../services/api.js';

import { SECTION_KEYS } from '../../templates/sectionCatalog.js';

const LABELS = {
  core: "Core Details",
  job: "Job Details",
  switchboard: "Switchboard",
  subBoard: "Sub‑Board",
  inverter: "Inverter",
  monitor: "Monitoring & Existing",
  roof: "Roof Profile",
  mudmap: "Mud Map",
  final: "Final Checks",
};

const emptyTemplate = {
  key: "", name: "", version: 1, status: "draft",
  appliesTo: [],
  steps: [],
  validation: {
    requiredFields: [
      "inspected_at",
      "inspector_name",
      "meter_phase",
      "inverter_location",
      "msb_condition",
      "roof_type"
    ]
  },
  meta: {
    enabledSections: [...SECTION_KEYS],
    stepGuards: []
  }
};

export default function AdminTemplatesPage() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState(emptyTemplate);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    try {
      const r = await getCompanyInspectionTemplates();
      setList(r.data || []);
    } catch (e) {
      setMsg(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function pick(tpl) {
    const meta = tpl.meta ? (typeof tpl.meta === "string" ? JSON.parse(tpl.meta) : tpl.meta) : {};
    const appliesTo = Array.isArray(tpl.appliesTo)
      ? tpl.appliesTo
      : tpl.applies_to
      ? JSON.parse(tpl.applies_to)
      : [];

    const stepGuards = Array.isArray(meta.stepGuards) ? meta.stepGuards : [];

    setForm({
      id: tpl.id,
      key: tpl.key,
      name: tpl.name,
      version: tpl.version,
      status: tpl.status,
      appliesTo,
      steps: [],
      validation:
        typeof tpl.validation === "string"
          ? JSON.parse(tpl.validation)
          : tpl.validation || emptyTemplate.validation,
      meta: {
        enabledSections:
          meta.enabledSections && meta.enabledSections.length
            ? meta.enabledSections
            : [...SECTION_KEYS],
        stepGuards
      }
    });
  }

  // SECTION TOGGLING
  function toggleSection(secKey) {
    const enabled = new Set(form.meta?.enabledSections || []);
    if (enabled.has(secKey)) enabled.delete(secKey);
    else enabled.add(secKey);

    setForm((f) => ({
      ...f,
      meta: { ...f.meta, enabledSections: [...enabled] }
    }));
  }

  // SELFIE GUARD
  function toggleSelfieGuardJob() {
    const guards = Array.isArray(form.meta?.stepGuards)
      ? [...form.meta.stepGuards]
      : [];
    const idx = guards.findIndex((g) => g.stepId === "job");
    const rule = { stepId: "job", fields: ["jobDetails.licenseSelfie"] };

    if (idx >= 0) {
      const same = JSON.stringify(guards[idx]) === JSON.stringify(rule);
      if (same) guards.splice(idx, 1);
      else guards[idx] = rule;
    } else {
      guards.push(rule);
    }

    setForm((f) => ({ ...f, meta: { ...f.meta, stepGuards: guards } }));
  }

  function hasSelfieGuardJob() {
    return (
      Array.isArray(form.meta?.stepGuards) &&
      form.meta.stepGuards.some(
        (g) =>
          g.stepId === "job" &&
          Array.isArray(g.fields) &&
          g.fields.includes("jobDetails.licenseSelfie")
      )
    );
  }

  // SAVE
  async function onSave() {
    try {
      setMsg("");
      const payload = {
        id: form.id,
        key: form.key,
        name: form.name,
        version: form.version,
        status: form.status,
        appliesTo: form.appliesTo || [],
        steps: [],
        validation: form.validation,
        meta: {
          enabledSections: form.meta?.enabledSections || [],
          stepGuards: form.meta?.stepGuards || []
        }
      };

      const r = await saveInspectionTemplate(payload);
      if (!form.id)
        setForm((f) => ({ ...f, id: r.id }));

      setMsg("Saved");
      load();
    } catch (e) {
      setMsg(e.message || "Save failed");
    }
  }

  async function onPublish() {
    try {
      if (!form.id) return setMsg("Save before publish");
      await publishInspectionTemplate(form.id);
      setMsg("Published");
      load();
    } catch (e) {
      setMsg(e.message || "Publish failed");
    }
  }

  async function onDelete(id) {
    if (!window.confirm("Delete this template?")) return;
    try {
      await deleteInspectionTemplate(id);
      load();
    } catch (e) {
      setMsg(e.message || "Delete failed");
    }
  }

  // ======================= UI ========================
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "300px 1fr",
      gap: 20,
      padding: 20
    }}>
      {/* LEFT SIDEBAR */}
      <div style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 16,
        background: "#fff",
        height: "calc(100vh - 60px)",
        overflowY: "auto"
      }}>
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 12 }}>
          Templates
        </div>

        <button
          onClick={() => setForm({ ...emptyTemplate })}
          style={{
            width: "100%",
            padding: 10,
            background: "#1a7b7b",
            borderRadius: 8,
            color: "#fff",
            border: "none",
            marginBottom: 12,
            cursor: "pointer",
            fontWeight: 700
          }}
        >
          + New Template
        </button>

        {loading ? (
          <div>Loading...</div>
        ) : (
          (list || []).map((t) => (
            <div
              key={t.id}
              style={{
                padding: "10px 0",
                borderBottom: "1px solid #eee",
                display: "flex",
                justifyContent: "space-between"
              }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>{t.name}</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  {t.key} • v{t.version} • {t.status}
                </div>
              </div>
              <div>
                <button onClick={() => pick(t)}>Edit</button>
                <button
                  onClick={() => onDelete(t.id)}
                  style={{ marginLeft: 6, color: "#b91c1c" }}
                >
                  Del
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* RIGHT EDITOR */}
      <div style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 20,
        background: "#fff"
      }}>
        {msg && (
          <div
            style={{
              marginBottom: 12,
              padding: 10,
              background: "#ECFDF5",
              color: "#1A7B7B",
              borderRadius: 8
            }}
          >
            {msg}
          </div>
        )}

        {/* Basic Info */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12
        }}>
          <label style={{ fontWeight: 600 }}>
            Key
            <input
              value={form.key}
              onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
              style={{ width: "100%", marginTop: 4 }}
            />
          </label>

          <label style={{ fontWeight: 600 }}>
            Name
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              style={{ width: "100%", marginTop: 4 }}
            />
          </label>

          <label style={{ fontWeight: 600 }}>
            Version
            <input
              type="number"
              value={form.version}
              onChange={(e) =>
                setForm((f) => ({ ...f, version: Number(e.target.value) }))
              }
              style={{ width: "100%", marginTop: 4 }}
            />
          </label>

          <label style={{ fontWeight: 600 }}>
            Status
            <select
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({ ...f, status: e.target.value }))
              }
              style={{ width: "100%", marginTop: 4 }}
            >
              <option value="draft">draft</option>
              <option value="published">published</option>
            </select>
          </label>

          <label style={{ fontWeight: 600 }}>
            Applies To (comma separated)
            <input
              value={(form.appliesTo || []).join(",")}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  appliesTo: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                }))
              }
              style={{ width: "100%", marginTop: 4 }}
            />
          </label>
        </div>

        {/* Sections */}
        <hr style={{ margin: "20px 0" }} />

        <div style={{ fontWeight: 700, marginBottom: 10 }}>
          Sections to show
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 10
        }}>
          {SECTION_KEYS.map((k) => (
            <label
              key={k}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: 10,
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                background: "#f9fafb"
              }}
            >
              <input
                type="checkbox"
                checked={(form.meta?.enabledSections || []).includes(k)}
                onChange={() => toggleSection(k)}
              />
              <span>{LABELS[k] || k}</span>
            </label>
          ))}
        </div>

        {/* Step Guards */}
        <hr style={{ margin: "20px 0" }} />

        <div style={{
          padding: 12,
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          background: "#f9fafb"
        }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>
            Step Guards
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="checkbox"
              checked={hasSelfieGuardJob()}
              onChange={toggleSelfieGuardJob}
            />
            <span>
              Require <b>License Selfie</b> before leaving <b>Job Details</b>
            </span>
          </label>
        </div>

        {/* Footer */}
        <hr style={{ margin: "20px 0" }} />
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onSave}
            style={{
              padding: "10px 16px",
              background: "#1A7B7B",
              color: "#fff",
              borderRadius: 8,
              border: "none",
              fontWeight: 700
            }}
          >
            Save Draft
          </button>

          <button
            onClick={onPublish}
            style={{
              padding: "10px 16px",
              background: "#111827",
              color: "#fff",
              borderRadius: 8,
              border: "none",
              fontWeight: 700
            }}
          >
            Publish
          </button>
        </div>
      </div>
    </div>
  );
}