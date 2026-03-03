import { Clock, UserCircle2 } from 'lucide-react';

export default function ActivityList({ items = [] }) {  
  return (
    <div style={{ display:'grid', gap:12 }}>
      {items.map((a,i) => (
        <div key={i} style={{ display:'grid', gridTemplateColumns:'28px 1fr', gap:10, alignItems:'center' }}>
          <div style={{ width:28, height:28, borderRadius:999, background:'#e6f2f2',
                        display:'grid', placeItems:'center', color:'#146b6b' }}>
            <UserCircle2 size={16}/>
          </div>
          <div>
            <div style={{ fontSize:13, color:'#0f172a' }}>
              <strong>{a.who}</strong> {a.what}
            </div>
            <div style={{ fontSize:12, color:'#64748b', display:'flex', alignItems:'center', gap:6 }}>
              <Clock size={13}/> {a.when}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}