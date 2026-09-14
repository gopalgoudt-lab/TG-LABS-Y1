import type { Metadata } from 'next';
import BrandLogo from '@/components/BrandLogo';
import { healthArticles } from '@/lib/health-content';

export const metadata:Metadata={
 title:'Health Blog | TG Labs',
 description:'Patient-friendly guides to common diagnostic tests and preventive health topics from TG Labs.',
 alternates:{canonical:'https://www.tglabs.in/health-blog'},
 openGraph:{title:'TG Labs Health Blog',description:'Clear, patient-friendly guides to common diagnostic tests and preventive health topics.',url:'https://www.tglabs.in/health-blog',type:'website'}
};

export default function HealthBlog(){return <main style={{minHeight:'100vh',background:'#f5faf8',color:'#163b34',fontFamily:'Arial,sans-serif'}}>
 <header style={{background:'#fff',borderBottom:'1px solid #dbe8e3'}}><div style={{maxWidth:1180,margin:'0 auto',padding:'18px 22px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:16}}><a href="/" aria-label="TG Labs home" style={{width:150}}><BrandLogo/></a><nav style={{display:'flex',gap:18,flexWrap:'wrap'}}><a href="/" style={{color:'#17463d',fontWeight:700}}>Home</a><a href="/#catalog" style={{color:'#17463d',fontWeight:700}}>Tests & Packages</a><a href="/compare/labs" style={{color:'#17463d',fontWeight:700}}>Partner Labs</a></nav></div></header>
 <section style={{maxWidth:1180,margin:'0 auto',padding:'54px 22px 28px'}}><span style={{fontSize:12,fontWeight:900,letterSpacing:1.3,color:'#087f6f'}}>TG LABS · HEALTH EDUCATION</span><h1 style={{fontSize:'clamp(34px,5vw,56px)',lineHeight:1.05,margin:'12px 0 16px'}}>Understand your diagnostic tests with confidence.</h1><p style={{maxWidth:760,fontSize:18,lineHeight:1.7,color:'#536b65'}}>Straightforward educational guides about common blood tests and preventive health topics. These articles explain what a test measures and what to expect, without replacing advice from your doctor.</p></section>
 <section style={{maxWidth:1180,margin:'0 auto',padding:'12px 22px 54px',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:18}}>{healthArticles.map(article=><article key={article.slug} style={{background:'#fff',border:'1px solid #dce9e4',borderRadius:18,padding:24,boxShadow:'0 10px 30px rgba(20,75,65,.05)'}}><small style={{fontWeight:800,color:'#087f6f'}}>{article.readingTime}</small><h2 style={{fontSize:23,lineHeight:1.25,margin:'10px 0'}}>{article.title}</h2><p style={{color:'#5a706a',lineHeight:1.65}}>{article.summary}</p><a href={`/health-blog/${article.slug}`} style={{display:'inline-block',marginTop:12,color:'#087f6f',fontWeight:900}}>Read guide →</a></article>)}</section>
 <section style={{maxWidth:1180,margin:'0 auto 54px',padding:'0 22px'}}><div style={{background:'#e8f5f1',borderRadius:18,padding:24,lineHeight:1.65}}><b>Medical information notice</b><p style={{marginBottom:0}}>TG Labs health articles are for general education only. They do not diagnose disease, recommend treatment, or replace consultation with a qualified healthcare professional. Follow the preparation instructions provided for your specific booking.</p></div></section>
 </main>}
