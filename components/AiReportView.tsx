'use client';

import { useRef, type ReactNode } from 'react';

type Props={text:string;language?:string};

function inline(text:string){
 const parts=text.split(/(\*\*[^*]+\*\*)/g);
 return parts.map((p,i)=>p.startsWith('**')&&p.endsWith('**')?<strong key={i}>{p.slice(2,-2)}</strong>:p);
}
function clean(line:string){return line.replace(/^#{1,6}\s*/,'').replace(/^\d+\.\s*/, '').trim()}
function isTableLine(line:string){return line.trim().startsWith('|')&&line.trim().endsWith('|')}
function cells(line:string){return line.trim().slice(1,-1).split('|').map(x=>x.trim())}
function separator(line:string){return cells(line).every(x=>/^:?-{3,}:?$/.test(x))}
function badge(text:string){const v=text.toLowerCase();if(/high|elevated|above|increased|अधिक|उच्च|ఎక్కువ|పెరిగ/.test(v))return {label:'HIGH',bg:'#fff1f2',fg:'#be123c'};if(/low|below|decreased|कम|निम्न|తక్కువ|తగ్గ/.test(v))return {label:'LOW',bg:'#fff7ed',fg:'#c2410c'};if(/normal|within|सामान्य|సాధారణ/.test(v))return {label:'NORMAL',bg:'#ecfdf5',fg:'#047857'};return null}
function Table({lines}:{lines:string[]}){const rows=lines.filter(x=>!separator(x)).map(cells);if(!rows.length)return null;return <div style={{overflowX:'auto',margin:'12px 0'}}><table style={{width:'100%',borderCollapse:'separate',borderSpacing:0,minWidth:620,fontSize:13}}><thead><tr>{rows[0].map((c,i)=><th key={i} style={th}>{inline(c)}</th>)}</tr></thead><tbody>{rows.slice(1).map((r,ri)=><tr key={ri}>{r.map((c,ci)=>{const b=ci===r.length-1?badge(c):null;return <td key={ci} style={td}>{b?<><span style={{...pill,background:b.bg,color:b.fg}}>{b.label}</span><span style={{marginLeft:7}}>{inline(c)}</span></>:inline(c)}</td>})}</tr>)}</tbody></table></div>}
function Card({title,children}:{title:string;children:ReactNode}){return <section style={{background:'#fff',border:'1px solid #e7e5f4',borderRadius:16,padding:'16px 18px',boxShadow:'0 5px 18px rgba(80,56,168,.04)',breakInside:'avoid'}}><h4 style={{margin:'0 0 11px',fontSize:16,color:'#382b72'}}>{title}</h4>{children}</section>}

export default function AiReportView({text,language}:Props){
 const printRef=useRef<HTMLDivElement>(null);
 const lines=text.replace(/\r/g,'').split('\n');const sections:{title:string;lines:string[]}[]=[];let current={title:language==='te'?'రిపోర్ట్ వివరణ':language==='hi'?'रिपोर्ट विवरण':'Report explanation',lines:[] as string[]};
 for(const raw of lines){const line=raw.trim();if(!line)continue;if(/^#{1,6}\s+/.test(line)||/^\d+\.\s+[A-Z\u0900-\u097F\u0C00-\u0C7F]/.test(line)){if(current.lines.length)sections.push(current);current={title:clean(line),lines:[]};}else current.lines.push(line)}if(current.lines.length)sections.push(current);
 function printOrSave(){
  const content=printRef.current?.innerHTML;if(!content)return;
  const w=window.open('','_blank','width=980,height=800');if(!w)return;
  const lang=language==='te'?'Telugu':language==='hi'?'Hindi':'English';
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>TG Labs AI Health Report - ${lang}</title><style>@page{size:A4;margin:14mm}*{box-sizing:border-box}body{font-family:Arial,"Noto Sans Telugu","Noto Sans Devanagari",sans-serif;color:#253d38;margin:0;background:#fff}.head{border-bottom:2px solid #087f6b;padding-bottom:12px;margin-bottom:16px}.brand{font-size:22px;font-weight:900;color:#087f6b}.sub{font-size:13px;color:#64748b;margin-top:4px}.note{margin-top:16px;padding:10px 12px;background:#fff8e7;border:1px solid #f0d89a;border-radius:10px;font-size:12px;color:#6b4e10}table{page-break-inside:auto}tr{page-break-inside:avoid;page-break-after:auto}section{page-break-inside:avoid}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><div class="head"><div class="brand">TG LABS • AI HEALTH REPORT</div><div class="sub">Language: ${lang} • Educational explanation of the laboratory report</div></div>${content}<div class="note"><b>Important:</b> This AI-generated explanation is for education only and does not replace medical advice, diagnosis, or treatment from a qualified healthcare professional.</div><script>window.onload=()=>{setTimeout(()=>window.print(),250)}<\/script></body></html>`);
  w.document.close();w.focus();
 }
 return <div style={{marginTop:16}}><div style={{display:'flex',justifyContent:'flex-end',marginBottom:10}}><button type="button" onClick={printOrSave} style={{border:'1px solid #a7cfc6',borderRadius:11,padding:'9px 13px',background:'#f0faf7',color:'#087f6b',fontWeight:900,cursor:'pointer',fontSize:13}}>🖨 Print / Save PDF</button></div><div ref={printRef} style={{display:'grid',gap:12}}>{sections.map((s,si)=><Card key={si} title={s.title}><SectionBody lines={s.lines}/></Card>)}</div></div>
}
function SectionBody({lines}:{lines:string[]}){const out:ReactNode[]=[];let i=0;while(i<lines.length){if(isTableLine(lines[i])){const t:string[]=[];while(i<lines.length&&isTableLine(lines[i]))t.push(lines[i++]);out.push(<Table key={`t${i}`} lines={t}/>);continue}const line=lines[i++];if(/^[-*]\s+/.test(line)){const items=[line.replace(/^[-*]\s+/,'')];while(i<lines.length&&/^[-*]\s+/.test(lines[i]))items.push(lines[i++].replace(/^[-*]\s+/,''));out.push(<ul key={`u${i}`} style={{margin:'6px 0 4px',paddingLeft:21,lineHeight:1.7}}>{items.map((x,j)=><li key={j} style={{marginBottom:5}}>{inline(x)}</li>)}</ul>);continue}out.push(<p key={`p${i}`} style={{margin:'7px 0',lineHeight:1.75,color:'#334155'}}>{inline(line)}</p>)}return <>{out}</>}
const th={textAlign:'left' as const,padding:'10px 11px',background:'#f5f3ff',borderBottom:'1px solid #ddd6fe',color:'#4c3b87',fontWeight:900};const td={padding:'10px 11px',borderBottom:'1px solid #eef2f7',verticalAlign:'top' as const,color:'#334155'};const pill={display:'inline-block',padding:'3px 7px',borderRadius:999,fontSize:10,fontWeight:900,letterSpacing:.3};
