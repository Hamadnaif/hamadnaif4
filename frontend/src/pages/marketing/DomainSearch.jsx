import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Search, Loader2, AlertCircle, HelpCircle, CheckCircle2, XCircle } from "lucide-react";

export default function DomainSearch() {
  const [q, setQ] = useState("");
  const [res, setRes] = useState(null);
  const [loading, setLoading] = useState(false);

  const search = async (e) => {
    e?.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.get("/public/domain/search", { params: { q } });
      setRes(data);
    } catch { setRes(null); }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-16" data-testid="domains-page">
      <div className="text-center mb-8">
        <h1 className="font-head text-4xl sm:text-5xl font-extrabold brand-text mb-3">ابحث عن نطاقك</h1>
        <p className="text-slate-600">اعثر على النطاق المثالي لموقعك واحجزه من داخل المنصة.</p>
      </div>

      <form onSubmit={search} className="flex gap-2 bg-white rounded-2xl border border-slate-200 soft-shadow p-2 mb-8">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="اكتب اسم النطاق المطلوب" className="flex-1 px-4 py-3 outline-none bg-transparent" data-testid="domain-input" />
        <Button type="submit" disabled={loading} className="brand-bg text-white rounded-xl px-6" data-testid="domain-search-btn">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Search className="w-4 h-4 ms-1" /> بحث</>}
        </Button>
      </form>

      {res && (
        <div className="space-y-3" data-testid="domain-results">
          {res.message && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 mb-4">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm leading-relaxed">{res.message}</p>
            </div>
          )}
          {res.results.map((r) => (
            <div key={r.domain} className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-4 soft-shadow" data-testid={`domain-result-${r.tld}`}>
              <div className="flex items-center gap-3">
                <span className="font-bold text-lg brand-text" dir="ltr">{r.domain}</span>
                {r.available === true && <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-600 rounded-full px-2 py-1"><CheckCircle2 className="w-3 h-3" /> متوفر</span>}
                {r.available === false && <span className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-500 rounded-full px-2 py-1"><XCircle className="w-3 h-3" /> محجوز</span>}
                {r.available == null && <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-500 rounded-full px-2 py-1"><HelpCircle className="w-3 h-3" /> التوفر غير مؤكد</span>}
              </div>
              <div className="flex items-center gap-4">
                <div className="text-end">
                  <div className="font-bold brand-text">{r.price} {r.currency}<span className="text-slate-400 text-xs">/سنة</span></div>
                  <div className="text-xs text-slate-400">تجديد {r.renew_price} {r.currency}</div>
                </div>
                <Button disabled className={`rounded-full ${r.available === true ? "bg-slate-200 text-slate-500" : "bg-slate-200 text-slate-500"} cursor-not-allowed`} data-testid={`domain-buy-${r.tld}`}>
                  {r.available === true ? "الشراء قريبًا" : "الشراء معطّل"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
