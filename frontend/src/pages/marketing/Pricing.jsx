import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { usePageMeta } from "@/lib/usePageMeta";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, Gift, Info } from "lucide-react";

export default function Pricing() {
  usePageMeta("الباقات والأسعار", "باقات منصتي المرنة لإنشاء المواقع: ابدأ مجانًا بموقع واحد، أو رقِّ للباقات المدفوعة لمزيد من المواقع وربط النطاق الخاص.");
  const [plans, setPlans] = useState(null);
  const [cycle, setCycle] = useState("monthly");

  useEffect(() => { api.get("/public/plans").then((r) => setPlans(r.data)).catch(() => setPlans([])); }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 py-16" data-testid="pricing-page">
      <div className="text-center mb-8">
        <h1 className="font-head text-4xl sm:text-5xl font-extrabold brand-text mb-3">الباقات والأسعار</h1>
        <p className="text-slate-600 max-w-2xl mx-auto">ابدأ مجانًا وطوّر باقتك متى احتجت. الأسعار تجريبية قابلة للتعديل قبل الإطلاق الرسمي.</p>
      </div>

      {/* Free tier explainer */}
      <div className="max-w-3xl mx-auto mb-10 rounded-2xl border border-green-200 bg-green-50 p-5 flex items-start gap-3" data-testid="free-tier-note">
        <span className="w-10 h-10 rounded-xl bg-green-500 text-white grid place-items-center shrink-0"><Gift className="w-5 h-5" /></span>
        <div className="text-sm text-green-900 leading-relaxed">
          <b>ابدأ مجانًا:</b> إنشاء الحساب مجاني تمامًا ويشمل <b>موقعًا واحدًا</b> حتى ٥ صفحات مع نطاق فرعي مجاني بصيغة
          <span dir="ltr" className="mx-1">yoursite.منصتي</span> ونموذج تواصل. لا تحتاج بطاقة. الباقات المدفوعة تفتح مواقع إضافية وربط نطاقك الخاص.
        </div>
      </div>

      <div className="flex justify-center mb-12">
        <div className="inline-flex bg-white border border-slate-200 rounded-full p-1" data-testid="cycle-toggle">
          <button onClick={() => setCycle("monthly")} className={`px-6 py-2 rounded-full text-sm font-semibold transition-colors ${cycle === "monthly" ? "brand-bg text-white" : "text-slate-600"}`}>شهري</button>
          <button onClick={() => setCycle("yearly")} className={`px-6 py-2 rounded-full text-sm font-semibold transition-colors ${cycle === "yearly" ? "brand-bg text-white" : "text-slate-600"}`}>سنوي <span className="text-xs gold-text">(وفّر شهرين)</span></button>
        </div>
      </div>

      {plans === null ? (
        <div className="grid place-items-center py-16" data-testid="pricing-loading"><Loader2 className="w-8 h-8 animate-spin brand-accent-text" /></div>
      ) : plans.length === 0 ? (
        <p className="text-center text-slate-500 py-16">لا توجد باقات متاحة حاليًا.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
          {plans.map((p) => (
            <div key={p.id} className={`rounded-2xl p-8 bg-white border relative ${p.highlight ? "border-[var(--brand-accent)] soft-shadow-lg md:-translate-y-3" : "border-slate-200 soft-shadow"}`} data-testid={`plan-card-${p.id}`}>
              {p.highlight && <span className="absolute top-4 end-4 text-xs font-bold brand-accent-bg text-white rounded-full px-3 py-1">الأكثر شيوعًا</span>}
              <h3 className="font-head text-2xl font-extrabold brand-text">{p.name}</h3>
              <div className="my-5">
                <span className="text-5xl font-extrabold brand-text">{cycle === "yearly" ? p.price_yearly : p.price_monthly}</span>
                <span className="text-slate-500"> {p.currency}/{cycle === "yearly" ? "سنة" : "شهر"}</span>
              </div>
              <ul className="space-y-3 mb-4">
                {(p.features || []).map((f, i) => <li key={i} className="flex items-start gap-2 text-slate-700 text-sm"><CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" /> {f}</li>)}
                {!p.limits?.custom_domain && <li className="flex items-start gap-2 text-slate-400 text-sm"><XCircle className="w-5 h-5 shrink-0" /> ربط نطاق خاص</li>}
              </ul>
              {p.limits && (
                <div className="text-xs text-slate-500 border-t border-slate-100 pt-3 mb-6 space-y-1">
                  <div>عدد المواقع: <b className="brand-text">{p.limits.sites}</b></div>
                  <div>عدد الصفحات: <b className="brand-text">{p.limits.pages >= 100 ? "غير محدود" : p.limits.pages}</b></div>
                  <div>مساحة التخزين: <b className="brand-text">{Math.round((p.limits.storage_mb || 0) / 1024 * 10) / 10 >= 1 ? `${Math.round((p.limits.storage_mb) / 1024 * 10) / 10} GB` : `${p.limits.storage_mb} MB`}</b></div>
                </div>
              )}
              <Link to={`/register?plan=${p.id}&cycle=${cycle}`}><Button className={`w-full rounded-full py-6 ${p.highlight ? "brand-accent-bg text-white" : "brand-bg text-white"}`} data-testid={`plan-select-${p.id}`}>ابدأ بهذه الباقة</Button></Link>
            </div>
          ))}
        </div>
      )}

      <div className="max-w-3xl mx-auto mt-10 text-center text-slate-500 text-sm space-y-1">
        <p className="flex items-center justify-center gap-2"><Info className="w-4 h-4" /> جميع الأسعار بالريال السعودي (SAR) وغير شاملة ضريبة القيمة المضافة (تُضاف عند إتمام الدفع).</p>
        <p>الدفع الإلكتروني عبر بوابة محلية قيد التفعيل حاليًا؛ يمكنك إنشاء موقعك مجانًا الآن والترقية لاحقًا.</p>
      </div>
    </div>
  );
}
