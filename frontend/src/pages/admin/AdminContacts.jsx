import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Loader2, Mail, Globe } from "lucide-react";

export default function AdminContacts() {
  const [rows, setRows] = useState(null);
  useEffect(() => { api.get("/admin/contacts").then((r) => setRows(r.data)).catch(() => setRows([])); }, []);
  if (!rows) return <div className="grid place-items-center py-20"><Loader2 className="w-8 h-8 animate-spin brand-accent-text" /></div>;
  return (
    <div data-testid="admin-contacts">
      <h1 className="font-head text-2xl font-extrabold brand-text mb-6">رسائل التواصل ({rows.length})</h1>
      {rows.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300 text-slate-400"><Mail className="w-10 h-10 mx-auto mb-2" /> لا توجد رسائل.</div>
      ) : (
        <div className="space-y-3">
          {rows.map((m) => (
            <div key={m.id} className="bg-white rounded-2xl border border-slate-200 soft-shadow p-5" data-testid={`contact-${m.id}`}>
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                <div className="flex items-center gap-2"><span className="font-bold brand-text">{m.name}</span><span className="text-xs bg-slate-100 rounded-full px-2 py-0.5 text-slate-500">{m.type === "site" ? "من موقع عميل" : "المنصة"}</span></div>
                <span className="text-xs text-slate-400">{new Date(m.created_at).toLocaleString("ar-SA")}</span>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-slate-500 mb-2">
                <span dir="ltr" className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {m.email}</span>
                {m.phone && <span dir="ltr">{m.phone}</span>}
              </div>
              <p className="text-slate-700 leading-relaxed">{m.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
