function currency(v){ return v==null ? '—' : '$' + Number(v).toLocaleString(); }

export default function TeamTable({ rows=[] }) {
  return (
    <div role="table" style={{ overflowX:'auto' }}>
      <table style={{ width:'100%', borderCollapse:'separate', borderSpacing:0 }}>
        <thead>
          <tr style={{ textAlign:'left' }}>
            {['Name','Leads Contacted','Proposals Sent','Close Rate','Pipeline Value'].map(h => (
              <th key={h}
                  style={{ padding:'10px 12px', fontSize:12, color:'#64748b', fontWeight:800,
                           borderBottom:'1px solid #e5e7eb', background:'#fff', position:'sticky', top:0 }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r,i) => (
            <tr key={r.id} style={{ background: i%2 ? '#fbfdff' : '#fff' }}>
              <td style={td}><strong style={{ color:'#0f172a' }}>{r.name}</strong></td>
              <td style={td}>{r.leads}</td>
              <td style={td}>{r.proposals}</td>
              <td style={td}>
                <span style={{ fontWeight:800, color: r.closeRate >= 20 ? '#16a34a' : '#ef4444' }}>
                  {r.closeRate}%
                </span>
              </td>
              <td style={td}>{currency(r.pipeline)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
const td = { padding:'12px', color:'#0f172a', borderBottom:'1px solid #e5e7eb' };