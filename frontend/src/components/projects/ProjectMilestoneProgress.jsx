import React from 'react';

export default function ProjectMilestoneProgress({ stages, currentStage }) {
  if (!stages || !stages.length) return null;
  
  const currentIndex = stages.findIndex(s => s.key === currentStage);
  
  return (
    <div style={{ padding: '24px 0', marginBottom: '32px', overflowX: 'auto', paddingBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', minWidth: `${stages.length * 100}px`, padding: '0 24px' }}>
        {/* Background line */}
        <div style={{ position: 'absolute', top: '22px', left: '48px', right: '48px', height: '4px', background: '#e2e8f0', zIndex: 0 }} />
        
        {/* Progress line */}
        {currentIndex > 0 && (
           <div style={{ 
             position: 'absolute', 
             top: '22px', 
             left: '48px', 
             height: '4px', 
             background: '#0d9488', 
             zIndex: 1, 
             width: `calc(${(currentIndex / (stages.length - 1)) * 100}% - 96px)`, 
             transition: 'width 0.3s ease' 
           }} />
        )}
        
        {stages.map((stage, idx) => {
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          // Determine stage type (e.g. cancelled)
          const isCancelled = stage.key === 'cancelled';
          const isCurrentCancelled = isCurrent && isCancelled;

          let color = '#94a3b8';
          let bgColor = '#fff';
          let borderColor = '#cbd5e1';
          
          if (isCurrentCancelled) {
             color = '#dc2626';
             bgColor = '#fff';
             borderColor = '#dc2626';
          } else if (isCompleted) {
            color = '#fff';
            bgColor = '#0d9488';
            borderColor = '#0d9488';
          } else if (isCurrent) {
            color = '#0d9488';
            bgColor = '#fff';
            borderColor = '#0d9488';
          }

          return (
            <div key={stage.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, background: 'transparent', width: '80px' }}>
              <div style={{ 
                width: isCurrent ? '24px' : '20px', 
                height: isCurrent ? '24px' : '20px', 
                borderRadius: '50%', 
                background: bgColor,
                border: `3px solid ${borderColor}`,
                marginBottom: '12px',
                marginTop: isCurrent ? '10px' : '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isCurrent ? `0 0 0 4px ${isCurrentCancelled ? 'rgba(220, 38, 38, 0.2)' : 'rgba(13, 148, 136, 0.2)'}` : 'none',
                backgroundColor: '#fff' // override background to hide line behind
              }}>
                {isCompleted && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                )}
                {isCurrentCancelled && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                )}
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: isCurrent ? '700' : '500', color: isCurrent || isCompleted ? '#0f172a' : '#64748b', textAlign: 'center', lineHeight: '1.2' }}>
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
