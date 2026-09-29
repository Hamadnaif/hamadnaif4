import { useEffect, useState } from "react";
import { api, apiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
const labels = {PENDING:"قيد الانتظار",INITIATED:"بدأ التحويل",FAILED:"فشل التحويل",PAID_OUT:"تم التحويل"};
export default function Payouts() {
  const today=new Date().toISOString().slice(0,10);
  const [from,setFrom]=useState(new Date(Date.now()-29*86400000).toISOString().slice(0,10));
  const [to,setTo]=useState(today);
  const [data,setData]=useState(null);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  useEffect(()=>{api.get('/payouts').then(r=>setData(r.data)).catch(e=>setError(apiError(e.response?.data?.detail)));},[]);
  const sync=async()=>{setBusy(true);setError("");try{setData((await api.post('/payouts/sync',{date_from:Date.parse(from),date_to:Date.parse(to)+86400000-1})).data);}catch(e){setError(apiError(e.response?.data?.detail));}finally{setBusy(false);}};
  const download=async(id)=>{setBusy(true);setError("");try{const response=await api.get(`/payouts/${id}/download`,{responseType:'blob'});const url=URL.createObjectURL(response.data);const a=document.createElement('a');a.href=url;a.download=`${id}.zip`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){setError('تعذّر تنزيل التقرير. أعد المحاولة لاحقًا.');}finally{setBusy(false);}};
  return <div className="space-y-6" data-testid="payouts-page"><h2 className="font-extrabold brand-text text-2xl">التحويلات إلى حسابك</h2>
    <p className="text-slate-500">تقرير مستقل عن دفعات العملاء، ويتضمن حالة التحويل البنكي وتفاصيل التسوية.</p>
    <p className="bg-amber-50 text-amber-800 p-4 rounded-xl">وضع اختبار. {data?.configured ? "حدّث التقرير من Tap حسب الفترة." : "تقارير Tap قيد التفعيل."}</p>
    {error && <p role="alert" className="text-red-600">{error}</p>}
    <div className="flex gap-3 flex-wrap items-end"><label>من<input aria-label="من تاريخ" type="date" value={from} onChange={e=>setFrom(e.target.value)} className="block border p-3 rounded-xl" /></label><label>إلى<input aria-label="إلى تاريخ" type="date" value={to} onChange={e=>setTo(e.target.value)} className="block border p-3 rounded-xl" /></label><Button disabled={busy || !data?.configured} onClick={sync}>تحديث التحويلات</Button></div>
    {data?.has_more && <p className="text-amber-800">توجد نتائج إضافية لدى Tap. اختر فترة أقصر لعرضها.</p>}
    <div className="space-y-3">{data?.payouts?.length===0 && <p>لا توجد تحويلات معروضة بعد.</p>}{data?.payouts?.map(p=><div key={p.id} className="bg-white border rounded-xl p-5 flex justify-between gap-4 flex-wrap"><div><p className="font-bold">{p.amount} {p.currency} · {labels[p.status] || p.status}</p><p className="text-sm text-slate-500">{new Date(p.date).toLocaleDateString('ar-SA')} · {p.id}</p></div><Button disabled={busy || !data.configured} onClick={()=>download(p.id)}>تنزيل التقرير ZIP</Button></div>)}</div>
  </div>;
}
