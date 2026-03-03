function formatCurrency(v){ return v==null ? '—' : '$' + Number(v).toLocaleString(); }

export default function PipelineBarChart({ data }) {
  const max = Math.max(1, ...data.map(d => d.value || 0));
  return (
    <div role="list" style={{ display:'grid', gap:10 }}>
      {data.map(d => {
        const pct = Math.max(2, Math.round((d.value / max) * 100));
        return (
          <div key={d.stage}
               role="listitem"
               style={{ display:'grid', gridTemplateColumns:'180px 1fr 80px', gap:12, alignItems:'center' }}>
            <div style={{ color:'#64748b', fontWeight:700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {d.stage}
            </div>
            <div style={{ background:'#dbeafe', borderRadius:999, height:12, position:'relative' }}>
              <div style={{ position:'absolute', inset:0, width:`${pct}%`, background:'#0ea5e9', borderRadius:999 }}/>
            </div>
            <div style={{ textAlign:'right', fontWeight:800, color:'#0f172a' }}>{formatCurrency(d.value)}</div>
          </div>
        );
      })}
    </div>
  );
}