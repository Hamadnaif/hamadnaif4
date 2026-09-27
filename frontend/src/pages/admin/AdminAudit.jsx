import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Loader2, ScrollText } from "lucide-react";

export default function AdminAudit() {
  const [rows, setRows] = useState(null);
  useEffect(() => { api.get("/admin/audit").then((r) => setRows(r.data)).catch(() => setRows([])); }, []);
  if (!rows) return <div className="grid place-items-center py-20"><Loader2 className="w-8 h-8 animate-spin brand-accent-text" /></div>;
  return (
    <div data-testid="admin-audit">
      <h1 className="font-head text-2xl font-extrabold brand-text mb-6">سجل الإجراءات الإدارية</h1>
      <div className="bg-white rounded-2xl border border-slate-200 soft-shadow overflow-hidden">
        {rows.length === 0 ? (
          <div className="text-center py-16 text-slate-400"><ScrollText className="w-10 h-10 mx-auto mb-2" /> لا توجد إجراءات مسجّلة.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500"><tr><th className="text-start p-3">المدير</th><th className="text-start p-3">الإجراء</th><th className="text-start p-3">الهدف</th><th className="text-start p-3">التاريخ</th></tr></thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className="border-t border-slate-100">
                  <td className="p-3" dir="ltr">{a.admin_email}</td>
                  <td className="p-3 font-semibold brand-text">{a.action}</td>
                  <td className="p-3 text-slate-500">{a.target}</td>
                  <td className="p-3 text-slate-400">{new Date(a.created_at).toLocaleString("ar-SA")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
