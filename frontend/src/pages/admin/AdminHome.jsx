import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Users, Globe, Rocket, CreditCard, Inbox, ServerCog, Loader2 } from "lucide-react";

const CARDS = [
  { key: "customers", label: "العملاء", icon: Users },
  { key: "sites_total", label: "إجمالي المواقع", icon: Globe },
  { key: "sites_published", label: "مواقع منشورة", icon: Rocket },
  { key: "active_subscriptions", label: "اشتراكات نشطة", icon: CreditCard },
  { key: "contacts", label: "رسائل التواصل", icon: Inbox },
  { key: "domain_orders", label: "طلبات النطاقات", icon: ServerCog },
];

export default function AdminHome() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.get("/admin/stats").then((r) => setStats(r.data)).catch(() => setStats({})); }, []);
  if (!stats) return <div className="grid place-items-center py-20"><Loader2 className="w-8 h-8 animate-spin brand-accent-text" /></div>;
  return (
    <div data-testid="admin-home">
      <h1 className="font-head text-2xl font-extrabold brand-text mb-6">نظرة عامة</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((c) => (
          <div key={c.key} className="bg-white rounded-2xl border border-slate-200 soft-shadow p-6 flex items-center justify-between" data-testid={`stat-${c.key}`}>
            <div>
              <p className="text-slate-500 text-sm">{c.label}</p>
              <div className="text-3xl font-extrabold brand-text mt-1">{stats[c.key] ?? 0}</div>
            </div>
            <span className="w-12 h-12 rounded-xl brand-bg text-white grid place-items-center"><c.icon className="w-6 h-6" /></span>
          </div>
        ))}
      </div>
    </div>
  );
}
