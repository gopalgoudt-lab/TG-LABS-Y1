import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import BrandLogo from '@/components/BrandLogo';
import { healthArticleBySlug, healthArticles } from '@/lib/health-content';

export function generateStaticParams(){return healthArticles.map(({slug})=>({slug}));}

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{const {slug}=await params;const article=healthArticleBySlug(slug);if(!article)return {};const url=`https://www.tglabs.in/health-blog/${article.slug}`;return {title:article.title,description:article.description,alternates:{canonical:url},openGraph:{title:article.title,description:article.description,url,type:'article'}};}

export default async function HealthArticlePage({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const article=healthArticleBySlug(slug);if(!article)notFound();const url=`https://www.tglabs.in/health-blog/${article.slug}`;const jsonLd={'@context':'https://schema.org','@type':'Article',headline:article.title,description:article.description,dateModified:article.updated,mainEntityOfPage:url,publisher:{'@type':'Organization',name:'TG Labs',url:'https://www.tglabs.in'}};
 return <main style={{minHeight:'100vh',background:'#f7fbf9',color:'#173c35',fontFamily:'Arial,sans-serif'}}>
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd)}}/>
  <header style={{background:'#fff',borderBottom:'1px solid #dbe8e3'}}><div style={{maxWidth:980,margin:'0 auto',padding:'18px 22px',display:'flex',alignItems:'center',justifyContent:'space-between'}}><a href="/" style={{width:145}} aria-label="TG Labs home"><BrandLogo/></a><a href="/health-blog" style={{fontWeight:800,color:'#087f6f'}}>Health Blog</a></div></header>
  <article style={{maxWidth:820,margin:'0 auto',padding:'50px 22px 64px'}}><a href="/health-blog" style={{color:'#087f6f',fontWeight:800}}>← All health guides</a><div style={{marginTop:30,fontSize:13,fontWeight:800,color:'#61746f'}}>{article.readingTime} · Updated {new Date(article.updated).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</div><h1 style={{fontSize:'clamp(34px,6vw,54px)',lineHeight:1.08,margin:'12px 0 18px'}}>{article.title}</h1><p style={{fontSize:20,lineHeight:1.7,color:'#506862'}}>{article.summary}</p>
   {article.sections.map(section=><section key={section.heading} style={{marginTop:36}}><h2 style={{fontSize:28,marginBottom:12}}>{section.heading}</h2>{section.body.map((p,i)=><p key={i} style={{fontSize:17,lineHeight:1.8,color:'#3f5751'}}>{p}</p>)}</section>)}
   <aside style={{marginTop:42,background:'#eaf6f2',border:'1px solid #cde8df',borderRadius:18,padding:22}}><b>Important</b><p style={{lineHeight:1.7}}>This article provides general health education and is not a diagnosis or treatment recommendation. Discuss results, symptoms, medicines and individual risk factors with a qualified healthcare professional.</p></aside>
   <div style={{marginTop:28,padding:24,background:'#fff',border:'1px solid #dce9e4',borderRadius:18}}><h3 style={{marginTop:0}}>Looking for this test?</h3><p style={{color:'#5a706a'}}>Open the live TG Labs catalog to compare currently displayed partner options and check serviceability for your pincode.</p><a href={`/?q=${encodeURIComponent(article.searchQuery)}#catalog`} style={{display:'inline-block',background:'#087f6f',color:'#fff',padding:'12px 16px',borderRadius:10,fontWeight:900}}>Search {article.searchQuery} →</a></div>
  </article>
 </main>}
