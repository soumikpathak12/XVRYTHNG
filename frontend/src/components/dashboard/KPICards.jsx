import { TrendingUp, TrendingDown } from 'lucide-react';

export default function KpiCard({ icon, label, value, delta, up, accent = '#146b6b' }) {
  return (
    <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:14, padding:14,
                  display:'grid', gridTemplateColumns:'36px 1fr', gap:12, alignItems:'center' }}>
      <div aria-hidden="true"
           style={{ width:36, height:36, borderRadius:10, display:'grid', placeItems:'center',
                    color:accent, background:`${accent}20` }}>
        {icon}
      </div>
      <div style={{minWidth:0}}>
        <div style={{ fontSize:12, color:'#64748b', fontWeight:700 }}>{label}</div>
        <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
          <div style={{ fontSize:22, fontWeight:900, color:'#0f172a' }}>{value}</div>
          {delta != null && (
            <span style={{
              display:'inline-flex', alignItems:'center', gap:6, padding:'2px 8px', borderRadius:999,
              background: up ? '#ecfdf5' : '#fef2f2', color: up ? '#16a34a' : '#ef4444',
              fontWeight:700, fontSize:12
            }}>
              {up ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
              {up ? '+' : ''}{delta}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}