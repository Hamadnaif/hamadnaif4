import { useEffect, useState } from "react";
import { api, apiError } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Plus, Trash2 } from "lucide-react";

const inputCls = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--brand-accent)]";

export default function AdminPlans() {
  const [rows, setRows] = useState(null);
  const load = async () => { try { const { data } = await api.get("/admin/plans"); setRows(data); } catch { setRows([]); } };
  useEffect(() => { load(); }, []);

  const setField = (id, key, val) => setRows((r) => r.map((p) => (p.id === id ? { ...p, [key]: val } : p)));
  const setLimit = (id, key, val) => setRows((r) => r.map((p) => (p.id === id ? { ...p, limits: { ...p.limits, [key]: val } } : p)));

  const save = async (p) => {
    try {
      await api.put(`/admin/plans/${p.id}`, {
        name: p.name, price_monthly: Number(p.price_monthly), price_yearly: Number(p.price_yearly),
        features: p.features, limits: { ...p.limits, sites: Number(p.limits.sites), pages: Number(p.limits.pages), storage_mb: Number(p.limits.storage_mb) },
        is_active: p.is_active, highlight: p.highlight,
      });
      toast.success("تم حفظ الباقة");
    } catch (err) { toast.error(apiError(err.response?.data?.detail)); }
  };

  if (!rows) return <div className="grid place-items-center py-20"><Loader2 className="w-8 h-8 animate-spin brand-accent-text" /></div>;

  return (
    <div data-testid="admin-plans">
      <h1 className="font-head text-2xl font-extrabold brand-text mb-6">الباقات والأسعار</h1>
      <div className="grid gap-6 lg:grid-cols-3">
        {rows.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl border border-slate-200 soft-shadow p-5 space-y-3" data-testid={`admin-plan-${p.id}`}>
            <input value={p.name} onChange={(e) => setField(p.id, "name", e.target.value)} className={`${inputCls} font-bold`} data-testid={`plan-name-${p.id}`} />
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-slate-400">شهري</label><input type="number" value={p.price_monthly} onChange={(e) => setField(p.id, "price_monthly", e.target.value)} className={inputCls} data-testid={`plan-monthly-${p.id}`} /></div>
              <div><label className="text-xs text-slate-400">سنوي</label><input type="number" value={p.price_yearly} onChange={(e) => setField(p.id, "price_yearly", e.target.value)} className={inputCls} /></div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><label className="text-xs text-slate-400">مواقع</label><input type="number" value={p.limits?.sites} onChange={(e) => setLimit(p.id, "sites", e.target.value)} className={inputCls} /></div>
              <div><label className="text-xs text-slate-400">صفحات</label><input type="number" value={p.limits?.pages} onChange={(e) => setLimit(p.id, "pages", e.target.value)} className={inputCls} /></div>
              <div><label className="text-xs text-slate-400">تخزين</label><input type="number" value={p.limits?.storage_mb} onChange={(e) => setLimit(p.id, "storage_mb", e.target.value)} className={inputCls} /></div>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!p.limits?.custom_domain} onChange={(e) => setLimit(p.id, "custom_domain", e.target.checked)} /> يسمح بنطاق خاص</label>
            <div>
              <label className="text-xs text-slate-400 block mb-1">المزايا (سطر لكل ميزة)</label>
              <textarea value={(p.features || []).join("\n")} onChange={(e) => setField(p.id, "features", e.target.value.split("\n").filter(Boolean))} className={inputCls} rows={5} data-testid={`plan-features-${p.id}`} />
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!p.highlight} onChange={(e) => setField(p.id, "highlight", e.target.checked)} /> مميّزة</label>
            <Button onClick={() => save(p)} className="w-full brand-bg text-white rounded-full" data-testid={`plan-save-${p.id}`}><Save className="w-4 h-4 ms-1" /> حفظ</Button>
          </div>
        ))}
      </div>
    </div>
  );
}
