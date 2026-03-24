import React from 'react';

export default function ProjectMilestoneProgress({ stages, currentStage }) {
  if (!stages || !stages.length) return null;

  const currentIndex = stages.findIndex((s) => s.key === currentStage);
  const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
  const total = stages.length;
  const progressPct = total > 1 ? (safeCurrentIndex / (total - 1)) * 100 : 0;

  return (
    <div
      style={{
        marginBottom: 28,
        border: '1px solid #E2E8F0',
        borderRadius: 14,
        background: '#fff',
        padding: '16px 12px 12px',
        overflowX: 'auto',
        scrollbarWidth: 'thin',
      }}
    >
      <div
        style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          minWidth: `${Math.max(stages.length * 115, 760)}px`,
          padding: '8px 14px 0',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 24,
            left: 34,
            right: 34,
            height: 3,
            borderRadius: 999,
            background: '#E2E8F0',
            zIndex: 0,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 24,
            left: 34,
            width: `calc(${progressPct}% - ${(progressPct / 100) * 68}px)`,
            minWidth: safeCurrentIndex > 0 ? 2 : 0,
            height: 3,
            borderRadius: 999,
            background: '#0D9488',
            zIndex: 1,
            transition: 'width 220ms ease',
          }}
        />

        {stages.map((stage, idx) => {
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const isCancelled = stage.key === 'cancelled';
          const isCurrentCancelled = isCurrent && isCancelled;

          let borderColor = '#CBD5E1';
          let dotBg = '#FFFFFF';
          let labelColor = '#64748B';

          if (isCurrentCancelled) {
            borderColor = '#DC2626';
            labelColor = '#991B1B';
          } else if (isCompleted) {
            borderColor = '#0D9488';
            dotBg = '#0D9488';
            labelColor = '#0F172A';
          } else if (isCurrent) {
            borderColor = '#0D9488';
            labelColor = '#0F172A';
          }

          return (
            <div
              key={stage.key}
              style={{
                width: 96,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                zIndex: 2,
              }}
            >
              <div
                style={{
                  width: isCurrent ? 22 : 18,
                  height: isCurrent ? 22 : 18,
                  borderRadius: '50%',
                  border: `3px solid ${borderColor}`,
                  background: dotBg,
                  marginBottom: 10,
                  marginTop: isCurrent ? 5 : 7,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: isCurrent
                    ? `0 0 0 4px ${isCurrentCancelled ? 'rgba(220,38,38,0.15)' : 'rgba(13,148,136,0.16)'}`
                    : 'none',
                }}
              >
                {isCompleted && (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                {isCurrentCancelled && (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                )}
              </div>
              <span
                title={stage.label}
                style={{
                  fontSize: 11,
                  fontWeight: isCurrent ? 700 : 600,
                  color: labelColor,
                  textAlign: 'center',
                  lineHeight: 1.25,
                  maxWidth: 92,
                  wordBreak: 'break-word',
                }}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
