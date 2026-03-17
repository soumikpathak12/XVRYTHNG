import React, { useMemo, useState } from 'react';

// --- Brand palette (strict) ---
const BRAND = {
  primaryTeal: '#1A7B7B',
  secondaryTeal: '#4DB8A8',
  textPrimary: '#1A1A2E',
  textSecondary: '#555555',
  surface: '#F5F5F5',
  success: '#28A745',
};

function formatCurrency(v) {
  if (v == null || Number.isNaN(Number(v))) return '—';

  return '$' + Number(v).toLocaleString();
}

/**
 * PipelineBarChart
 * @param {{ data: Array<{stage: string, value: number}>, title?: string, period?: string, onPeriodChange?: (value: string) => void }}
 */
export default function PipelineBarChart({ data = [], title = 'Pipeline Value by Stage', period = 'This Month', onPeriodChange }) {
  // Guard
  const safe = Array.isArray(data) ? data : [];
  const max = Math.max(1, ...safe.map(d => Number(d.value) || 0));

  const barColors = useMemo(() => {
    return [
      '#156D6D', 
      '#1A7B7B',
      '#2B9085',
      '#4DB8A8',
      '#7FD0C1',
      BRAND.success, 
    ];
  }, []);

  const colorForIndex = (i) => barColors[i % barColors.length];

  const ticks = [0.25, 0.5, 0.75, 1];

  const [localPeriod, setLocalPeriod] = useState(period);
  const PERIODS = ['This Month', 'Last Month', 'This Quarter', 'This Year'];

  function handleChange(e) {
    setLocalPeriod(e.target.value);
    onPeriodChange?.(e.target.value);
  }

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: 16,
        padding: 16,
      }}
      aria-label="Pipeline value chart"
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ color: BRAND.textPrimary, fontWeight: 800, fontSize: 18 }}>{title}</div>
        <div>
          <select
            value={localPeriod}
            onChange={handleChange}
            aria-label="Select period"
            style={{
              appearance: 'none',
              WebkitAppearance: 'none',
              MozAppearance: 'none',
              background: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: 10,
              padding: '8px 12px',
              color: BRAND.textPrimary,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {/* Plot area */}
      <div
        role="list"
        style={{
          position: 'relative',
          display: 'grid',
          gap: 12,
          padding: '8px 4px 4px 4px',
        }}
      >
        {/* Vertical grid lines */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: 180,
            right: 80,
            top: 0,
            bottom: 0,
            pointerEvents: 'none',
          }}
        >
          {ticks.map((t, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `calc(${t * 100}% - 1px)`,
                top: 0,
                bottom: 0,
                borderLeft: '1px dotted #E5E7EB',
              }}
            />
          ))}
        </div>

        {safe.map((d, idx) => {
          const value = Number(d.value) || 0;
          const pct = Math.round((value / max) * 100);
          const barPct = Math.max(2, pct); 
          const barColor = colorForIndex(idx);

          return (
            <div
              key={d.stage}
              role="listitem"
              style={{
                display: 'grid',
                gridTemplateColumns: '180px 1fr 60px',
                alignItems: 'center',
                gap: 12,
              }}
            >
              {/* Stage label (left) */}
              <div
                title={d.stage}
                style={{
                  color: BRAND.textPrimary,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {d.stage}
              </div>

              {/* Bar track */}
              <div
                style={{
                  background: '#EEF2F7',
                  borderRadius: 999,
                  height: 18,
                  position: 'relative',
                  overflow: 'hidden',
                }}
                aria-label={`${d.stage} pipeline bar`}
              >
                {/* Filled bar */}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${barPct}%`,
                    background: barColor,
                    borderRadius: 999,
                    transition: 'width .25s ease',
                  }}
                />

                <div
                  style={{
                    position: 'absolute',
                    right: Math.max(100 - barPct, 0) < 20 ? 4 : 'auto',
                    left: Math.max(100 - barPct, 0) < 20 ? 'auto' : `calc(${barPct}% + 6px)`,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: BRAND.textPrimary,
                    fontWeight: 800,
                    fontSize: 12,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {formatCurrency(value)}
                </div>
              </div>
              <div />
            </div>
          );
        })}
      </div>
    </div>
  );
}