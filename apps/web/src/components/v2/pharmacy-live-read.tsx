"use client";
import {useEffect,useSyncExternalStore} from 'react';
import type {PharmacyEngine} from '../../lib/api/pharmacy-live';
import {useApp} from '../context';
import {useLocale} from '../../lib/i18n/context';
import s from './pharmacy-live-read.module.css';
export function PharmacyLiveRead({engine}:{engine:PharmacyEngine}){
 const state=useSyncExternalStore(engine.subscribe,engine.snapshot,engine.snapshot);
 const {api,session}=useApp(),{locale}=useLocale();
 const c=(en:string,ar:string)=>locale==='ar'?ar:en;
 useEffect(()=>{
  let active=true;
  const refresh=async()=>{
   engine.resetReadScope();
   const observed=await api.session();
   if(!active)return;
   if(!observed)return;
   if(observed.name!==session.name||observed.role!==session.role){window.location.reload();return;}
   await engine.contexts();
  };
  void engine.contexts();
  const focus=()=>{void refresh();};window.addEventListener('focus',focus);
  return()=>{active=false;window.removeEventListener('focus',focus);engine.resetReadScope();};
 },[engine,api,session.name,session.role]);
 const {contexts,scope,queue,detail}=state;
 return <section className={s.root} data-pharmacy-read data-epoch={state.epoch}>
  <h1>{c('Pharmacy permitted reads','قراءات الصيدلية المسموحة')}</h1>
  <p>{c('Read only. Current organization membership and exact routed artifact are checked on every request.','قراءة فقط. العضوية الحالية والوصفة المحددة بيتراجعوا في كل طلب.')}</p>
  <div role={state.status==='denied'||state.status==='unavailable'?'alert':'status'} data-read-status>{state.status==='loading'?c('Loading permitted work…','بنحمّل العمل المسموح…'):state.status==='denied'?c('Current access unavailable','الصلاحية الحالية غير متاحة'):state.status==='unavailable'?c('Service unavailable; no previous details shown','الخدمة مش متاحة؛ مفيش تفاصيل سابقة ظاهرة'):state.status==='signed-out'?c('Session unavailable. Sign in again.','الجلسة مش متاحة. سجّل دخول تاني.'):state.status==='empty'?c('No permitted rows on this page','مفيش صفوف مسموحة في الصفحة دي'):c('Choose an exact permitted context','اختار الجهة المسموحة المحددة')}</div>
  <button onClick={()=>void engine.contexts()}>{c('Refresh permitted contexts','حدّث الجهات المسموحة')}</button>
  {contexts&&<div>
   <label>{c('Pharmacy organization','جهة الصيدلية')}<select aria-label="Pharmacy organization" value={scope?.orgId??''} onChange={e=>{engine.selectOrganization(e.target.value);}}><option value="">{c('Choose organization','اختار الجهة')}</option>{contexts.data.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
   <p>{c('Own organizations','جهاتك')}: {contexts.meta.total}; {c('page','صفحة')} {contexts.meta.page}</p>
   <button disabled={contexts.meta.page===1||state.status==='loading'} onClick={()=>void engine.contexts(contexts.meta.page-1,contexts.meta.pageSize)}>{c('Previous organizations','الجهات السابقة')}</button><button disabled={contexts.meta.page>=10000||contexts.meta.page*contexts.meta.pageSize>=contexts.meta.total||state.status==='loading'} onClick={()=>void engine.contexts(contexts.meta.page+1,contexts.meta.pageSize)}>{c('Next organizations','الجهات التالية')}</button>
  </div>}
  {scope&&<>
   <label>{c('Purpose','الغرض')}<select aria-label="Purpose" value={scope.purpose} onChange={e=>engine.selectPurpose(e.target.value as 'fulfillment'|'history')}><option value="fulfillment">{c('Fulfillment read','قراءة العمل المطلوب')}</option><option value="history">{c('Correction history read','قراءة سجل التصحيحات')}</option></select></label>
   <button disabled={state.status==='loading'} onClick={()=>void engine.queue(1,1)}>{c('Load queue','حمّل القائمة')}</button>
   {queue&&<><p data-queue-meta>{c('Routes','المسارات')}: {queue.meta.total}; {c('page','صفحة')} {queue.meta.page}</p><ul>{queue.data.map(r=><li key={r.id}><button onClick={()=>void engine.detail(r.id,1,1)}>{c('Open route','افتح المسار')} <bdi>{r.id}</bdi></button><span> {c('Recorded','المسجلة')}: {r.recordedState}; {c('Derived','المشتقة')}: {r.state}</span></li>)}</ul><button disabled={queue.meta.page===1||state.status==='loading'} onClick={()=>void engine.queue(queue.meta.page-1,1)}>{c('Previous queue page','صفحة القائمة السابقة')}</button><button disabled={queue.meta.page>=10000||queue.meta.page*queue.meta.pageSize>=queue.meta.total||state.status==='loading'} onClick={()=>void engine.queue(queue.meta.page+1,1)}>{c('Next queue page','صفحة القائمة التالية')}</button></>}
   {detail&&<article data-route-detail>
    <h2>{c('Exact route detail','تفاصيل المسار المحدد')}</h2><p>{c('Recorded','المسجلة')}: {detail.data.recordedState}; {c('Derived','المشتقة')}: {detail.data.state}</p>
    {detail.data.purpose==='FULFILLMENT'&&<p>{c('Patient source identity','هوية المريض من المصدر')}: <bdi>{detail.data.patientDisplayName??c('Not supplied','غير متاحة')}</bdi></p>}
    {!detail.data.items.length&&<p>{c('No dispense facts for this history route.','مفيش وقائع صرف للمسار ده في السجل.')}</p>}
    {detail.data.items.map(i=><section key={i.id}><h3 dir="auto">{i.medicationDisplay}</h3><p><bdi>{i.quantity}</bdi> <bdi>{i.unit}</bdi></p>{i.instructions!==null&&<p dir="auto">{i.instructions}</p>}<p>{i.fulfillmentState}</p>{i.dispense&&<><p>{c('Original immutable fact retained; reversed','واقعة الصرف الأصلية محفوظة؛ اتعكست')}: {String(i.dispense.reversed)}</p><p>{c('Correction total','عدد التصحيحات')}: {i.dispense.correctionHistoryMeta.total}; {c('page','صفحة')}: {i.dispense.correctionHistoryMeta.page}</p><ul>{i.dispense.corrections.map(x=><li key={x.id}>{x.kind} <span dir="auto">{x.reason}</span></li>)}</ul><button disabled={scope.nestedPage===1||state.status==='loading'} onClick={()=>void engine.detail(detail.data.id,scope.nestedPage-1,1)}>{c('Previous correction page','صفحة التصحيحات السابقة')}</button><button disabled={scope.nestedPage>=10000||scope.nestedPage>=i.dispense.correctionHistoryMeta.total||state.status==='loading'} onClick={()=>void engine.detail(detail.data.id,scope.nestedPage+1,1)}>{c('Next correction page','صفحة التصحيحات التالية')}</button></>}</section>)}
   </article>}
  </>}
 </section>;
}
