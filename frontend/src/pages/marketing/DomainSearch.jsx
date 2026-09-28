import { useState } from "react";
import { api } from "@/lib/api";
import { usePageMeta } from "@/lib/usePageMeta";
import { Button } from "@/components/ui/button";
import { Search, Loader2, AlertCircle, HelpCircle, CheckCircle2, XCircle, RefreshCw, Info } from "lucide-react";

export default function DomainSearch() {
  usePageMeta("ابحث عن نطاقك", "ابحث عن اسم النطاق المثالي لموقعك بامتدادات .com و.sa و.store وغيرها، واحجزه من داخل منصتي.");
  const [q, setQ] = useState("");
  const [res, setRes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const search = async (e) => {
    e?.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    setFailed(false);
    try {
      const { data } = await api.get("/public/domain/search", { params: { q } });
      setRes(data);
    } catch {
      setRes(null);
      setFailed(true);
    }
    setLoading(false);
  };

  const hasIndicative = res?.results?.some((r) => r.price_source === "indicative");

  return (
    <div className="max-w-4xl mx-auto px-6 py-16" data-testid="domains-page">
      <div className="text-center mb-8">
        <h1 className="font-head text-4xl sm:text-5xl font-extrabold brand-text mb-3">ابحث عن نطاقك</h1>
        <p className="text-slate-600">اعثر على النطاق المثالي لموقعك واحجزه من داخل المنصة.</p>
      </div>

      <form onSubmit={search} className="flex gap-2 bg-white rounded-2xl border border-slate-200 soft-shadow p-2 mb-8">
        <label htmlFor="domain-q" className="sr-only">اسم النطاق</label>
        <input id="domain-q" name="domain" value={q} onChange={(e) => setQ(e.target.value)} aria-label="اسم النطاق المطلوب"
          placeholder="اكتب اسم النطاق المطلوب" className="flex-1 px-4 py-3 outline-none bg-transparent" data-testid="domain-input" dir="ltr" />
        <Button type="submit" disabled={loading} className="brand-bg text-white rounded-xl px-6" data-testid="domain-search-btn">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Search className="w-4 h-4 ms-1" /> بحث</>}
        </Button>
      </form>

      {failed && (
        <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800" data-testid="domain-error">
          <span className="flex items-center gap-2 text-sm"><AlertCircle className="w-5 h-5 shrink-0" /> تعذّر إجراء البحث حاليًا. يرجى المحاولة مرة أخرى.</span>
          <Button onClick={search} variant="outline" className="rounded-full border-amber-300 text-amber-800 hover:bg-amber-100" data-testid="domain-retry-btn"><RefreshCw className="w-4 h-4 ms-1" /> إعادة المحاولة</Button>
        </div>
      )}

      {res && (
        <div className="space-y-3" data-testid="domain-results">
          {res.message && (
            <div className="flex items-start justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 mb-4">
              <span className="flex items-start gap-3"><AlertCircle className="w-5 h-5 shrink-0 mt-0.5" /><span className="text-sm leading-relaxed">{res.message}</span></span>
              {res.provider_error && (
                <Button onClick={search} variant="outline" className="rounded-full border-amber-300 text-amber-800 hover:bg-amber-100 shrink-0" data-testid="domain-retry-btn"><RefreshCw className="w-4 h-4 ms-1" /> إعادة المحاولة</Button>
              )}
            </div>
          )}
          {hasIndicative && (
            <div className="flex items-start gap-2 text-slate-500 text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 mb-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              الأسعار المعروضة <b className="mx-1">تقديرية</b> ولا تُعتمد للشراء. يُحدَّد السعر النهائي بعد تأكيد توفّر النطاق لدى المزوّد.
            </div>
          )}
          {res.results.map((r) => (
            <div key={r.domain} className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-4 soft-shadow" data-testid={`domain-result-${r.tld}`}>
              <div className="flex items-center gap-3">
                <span className="font-bold text-lg brand-text" dir="ltr">{r.domain}</span>
                {r.available === true && <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-600 rounded-full px-2 py-1"><CheckCircle2 className="w-3 h-3" /> متوفر</span>}
                {r.available === false && <span className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-500 rounded-full px-2 py-1"><XCircle className="w-3 h-3" /> محجوز</span>}
                {r.available == null && <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-500 rounded-full px-2 py-1"><HelpCircle className="w-3 h-3" /> التوفر غير مؤكد</span>}
              </div>
              <div className="flex items-center gap-4">
                <div className="text-end">
                  <div className="font-bold brand-text">
                    {r.price} {r.currency}<span className="text-slate-400 text-xs">/سنة</span>
                    {r.price_source === "indicative" && <span className="ms-1 text-[10px] text-amber-600 font-normal">(تقديري)</span>}
                  </div>
                  <div className="text-xs text-slate-400">تجديد {r.renew_price} {r.currency}</div>
                </div>
                <Button disabled className="rounded-full bg-slate-200 text-slate-500 cursor-not-allowed" data-testid={`domain-buy-${r.tld}`}>
                  {r.available === true ? "الشراء قريبًا" : "الشراء غير متاح"}
                </Button>
              </div>
            </div>
          ))}
          <p className="text-center text-slate-400 text-xs pt-2">لا يمكن إتمام الشراء إلا بعد تأكيد التوفّر والسعر النهائي من المزوّد وتفعيل الدفع.</p>
        </div>
      )}
    </div>
  );
}
