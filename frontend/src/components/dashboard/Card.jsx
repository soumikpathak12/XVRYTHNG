export default function Card({ title, right, children }) {
  return (
    <section style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:14, padding:16 }}>
      <header style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <h3 style={{ margin:0, fontSize:16, fontWeight:900, color:'#0f172a' }}>{title}</h3>
        {right}
      </header>
      {children}
    </section>
  );
}