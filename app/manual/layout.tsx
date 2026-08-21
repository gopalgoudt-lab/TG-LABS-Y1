import './manual.css';

export default function ManualLayout({children}:{children:React.ReactNode}){
  return <div className="thyrocare-manual">
    {children}
    <a href="/manual/catalog" style={{position:'fixed',right:18,bottom:18,zIndex:50,background:'#0d5f54',color:'#fff',textDecoration:'none',fontFamily:'Arial,sans-serif',fontWeight:800,fontSize:13,padding:'11px 14px',borderRadius:10,boxShadow:'0 8px 22px rgba(15,23,42,.18)'}}>🧪 Manage Tests / Packages</a>
  </div>;
}
