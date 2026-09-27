import { useEffect, useState } from "react";
import { api, apiError } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Globe, Loader2, Link2, AlertCircle, CheckCircle2, Clock } from "lucide-react";

const DSTATUS = {
  pending: { label: "بانتظار الإعداد", icon: Clock, cls: "text-amber-600 bg-amber-50" },
  verifying: { label: "جارٍ التحقق", icon: Loader2, cls: "text-blue-600 bg-blue-50" },
  connected: { label: "متصل", icon: CheckCircle2, cls: "text-green-600 bg-green-50" },
  error: { label: "حدث خطأ", icon: AlertCircle, cls: "text-red-600 bg-red-50" },
};

export default function Domains() {
  const [sites, setSites] = useState(null);
  const [selected, setSelected] = useState(null);
  const [domain, setDomain] = useState("");
  const [records, setRecords] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => { try { const { data } = await api.get("/sites"); setSites(data); } catch { setSites([]); } };
  useEffect(() => { load(); }, []);

  const connect = async () => {
    if (!selected || !domain) return;
    setBusy(true);
    try {
      const { data } = await api.post(`/sites/${selected}/domain`, { custom_domain: domain });
      setRecords(data.records);
      toast.success(data.message);
      load();
    } catch (err) { toast.error(apiError(err.response?.data?.detail)); }
    setBusy(false);
  };

  const verify = async (siteId) => {
    try {
      const { data } = await api.post(`/sites/${siteId}/domain/verify`);
      toast.info(data.message, { duration: 7000 });
      load();
    } catch (err) { toast.error(apiError(err.response?.data?.detail)); }
  };

  if (sites === null) return <div className="grid place-items-center py-20"><Loader2 className="w-8 h-8 animate-spin brand-accent-text" /></div>;

  return (
    <div className="space-y-8" data-testid="domains-page">
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-800">
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
        <p className="text-sm">ربط النطاق الخاص متاح في الباقات المدفوعة. التحقق الفعلي من DNS وتفعيل SSL يتطلب إعداد نطاق المنصة و wildcard DNS (يتم تفعيله لاحقًا).</p>
      </div>

      <div>
        <h2 className="font-head text-xl font-extrabold brand-text mb-4">ربط نطاق خاص</h2>
        <div className="bg-white rounded-2xl border border-slate-200 soft-shadow p-6 space-y-4">
          <select value={selected || ""} onChange={(e) => setSelected(e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none" data-testid="domain-site-select">
            <option value="">اختر الموقع</option>
            {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div className="flex gap-2">
            <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="example.com" dir="ltr" className="flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[var(--brand-accent)]" data-testid="domain-connect-input" />
            <Button onClick={connect} disabled={busy || !selected} className="brand-bg text-white rounded-xl px-6" data-testid="domain-connect-btn"><Link2 className="w-4 h-4 ms-1" /> ربط</Button>
          </div>
          {records && (
            <div className="mt-2">
              <p className="text-sm font-semibold text-slate-600 mb-2">أضف سجلات DNS التالية لدى مزوّد نطاقك:</p>
              <div className="overflow-x-auto"><table className="w-full text-sm border border-slate-200 rounded-lg">
                <thead className="bg-slate-50 text-slate-500"><tr><th className="p-2 text-start">النوع</th><th className="p-2 text-start">الاسم</th><th className="p-2 text-start">القيمة</th></tr></thead>
                <tbody>{records.map((r, i) => <tr key={i} className="border-t border-slate-100" dir="ltr"><td className="p-2 font-mono">{r.type}</td><td className="p-2 font-mono">{r.name}</td><td className="p-2 font-mono">{r.value}</td></tr>)}</tbody>
              </table></div>
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="font-head text-xl font-extrabold brand-text mb-4">النطاقات المرتبطة</h2>
        <div className="space-y-3">
          {sites.filter((s) => s.custom_domain).length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300 text-slate-400"><Globe className="w-10 h-10 mx-auto mb-2" /> لا توجد نطاقات مرتبطة بعد.</div>
          ) : sites.filter((s) => s.custom_domain).map((s) => {
            const st = DSTATUS[s.custom_domain_status] || DSTATUS.pending;
            return (
              <div key={s.id} className="bg-white rounded-2xl border border-slate-200 soft-shadow p-5 flex items-center justify-between flex-wrap gap-3" data-testid={`domain-item-${s.id}`}>
                <div>
                  <div className="font-bold brand-text" dir="ltr">{s.custom_domain}</div>
                  <p className="text-slate-400 text-sm">{s.name}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1 text-xs font-bold rounded-full px-3 py-1.5 ${st.cls}`}><st.icon className="w-3.5 h-3.5" /> {st.label}</span>
                  <Button variant="outline" onClick={() => verify(s.id)} className="rounded-full" data-testid={`domain-verify-${s.id}`}>تحقّق</Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
