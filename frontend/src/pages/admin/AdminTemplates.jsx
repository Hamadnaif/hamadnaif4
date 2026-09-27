import { useEffect, useState } from "react";
import { api, apiError } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

export default function AdminTemplates() {
  const [rows, setRows] = useState(null);
  const load = async () => { try { const { data } = await api.get("/admin/templates"); setRows(data); } catch { setRows([]); } };
  useEffect(() => { load(); }, []);

  const toggle = async (t) => {
    try { await api.put(`/admin/templates/${t.id}`, { is_active: !t.is_active }); load(); }
    catch (err) { toast.error(apiError(err.response?.data?.detail)); }
  };

  if (!rows) return <div className="grid place-items-center py-20"><Loader2 className="w-8 h-8 animate-spin brand-accent-text" /></div>;

  return (
    <div data-testid="admin-templates">
      <h1 className="font-head text-2xl font-extrabold brand-text mb-6">القوالب ({rows.length})</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((t) => (
          <div key={t.id} className="bg-white rounded-2xl border border-slate-200 soft-shadow overflow-hidden" data-testid={`admin-template-${t.id}`}>
            <img src={t.thumbnail} alt={t.name} className="w-full h-36 object-cover" />
            <div className="p-4">
              <span className="text-xs gold-text font-bold">{t.category}</span>
              <h3 className="font-bold brand-text">{t.name}</h3>
              <p className="text-slate-500 text-xs mt-1 line-clamp-2">{t.description}</p>
              <div className="flex items-center justify-between mt-3">
                <span className="text-sm text-slate-500">{t.is_active ? "معروض" : "مخفي"}</span>
                <Switch checked={t.is_active} onCheckedChange={() => toggle(t)} data-testid={`template-toggle-${t.id}`} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
