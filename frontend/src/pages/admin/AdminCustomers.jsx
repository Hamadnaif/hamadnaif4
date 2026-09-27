import { useEffect, useState } from "react";
import { api, apiError } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function AdminCustomers() {
  const [rows, setRows] = useState(null);
  const [plans, setPlans] = useState([]);

  const load = async () => {
    try {
      const [c, p] = await Promise.all([api.get("/admin/customers"), api.get("/admin/plans")]);
      setRows(c.data); setPlans(p.data);
    } catch { setRows([]); }
  };
  useEffect(() => { load(); }, []);

  const update = async (id, body) => {
    try { await api.put(`/admin/customers/${id}`, body); toast.success("تم التحديث"); load(); }
    catch (err) { toast.error(apiError(err.response?.data?.detail)); }
  };

  if (!rows) return <div className="grid place-items-center py-20"><Loader2 className="w-8 h-8 animate-spin brand-accent-text" /></div>;

  return (
    <div data-testid="admin-customers">
      <h1 className="font-head text-2xl font-extrabold brand-text mb-6">العملاء ({rows.length})</h1>
      <div className="bg-white rounded-2xl border border-slate-200 soft-shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500"><tr>
            <th className="text-start p-3">الاسم</th><th className="text-start p-3">البريد</th><th className="text-start p-3">المواقع</th>
            <th className="text-start p-3">الباقة</th><th className="text-start p-3">الحالة</th>
          </tr></thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-t border-slate-100" data-testid={`customer-row-${u.id}`}>
                <td className="p-3 font-semibold brand-text">{u.name}</td>
                <td className="p-3 text-slate-500" dir="ltr">{u.email}</td>
                <td className="p-3">{u.sites_count}</td>
                <td className="p-3">
                  <select value={u.plan_id || ""} onChange={(e) => update(u.id, { plan_id: e.target.value })} className="rounded-lg border border-slate-300 px-2 py-1 text-xs" data-testid={`customer-plan-${u.id}`}>
                    <option value="">مجانية</option>
                    {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </td>
                <td className="p-3">
                  <Button size="sm" variant={u.account_status === "suspended" ? "default" : "outline"} onClick={() => update(u.id, { account_status: u.account_status === "suspended" ? "active" : "suspended" })} className={`rounded-full text-xs ${u.account_status === "suspended" ? "bg-green-600" : "text-red-600 border-red-200"}`} data-testid={`customer-toggle-${u.id}`}>
                    {u.account_status === "suspended" ? "تفعيل" : "إيقاف"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-8 text-center text-slate-400">لا يوجد عملاء بعد.</p>}
      </div>
    </div>
  );
}
