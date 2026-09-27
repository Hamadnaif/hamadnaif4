import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";

export default function Pricing() {
  const [plans, setPlans] = useState([]);
  const [cycle, setCycle] = useState("monthly");

  useEffect(() => { api.get("/public/plans").then((r) => setPlans(r.data)).catch(() => {}); }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 py-16" data-testid="pricing-page">
      <div className="text-center mb-8">
        <h1 className="font-head text-4xl sm:text-5xl font-extrabold brand-text mb-3">الباقات والأسعار</h1>
        <p className="text-slate-600 max-w-2xl mx-auto">أسعار تجريبية واضحة قابلة للتعديل من لوحة الإدارة قبل الإطلاق الرسمي.</p>
      </div>

      <div className="flex justify-center mb-12">
        <div className="inline-flex bg-white border border-slate-200 rounded-full p-1" data-testid="cycle-toggle">
          <button onClick={() => setCycle("monthly")} className={`px-6 py-2 rounded-full text-sm font-semibold transition-colors ${cycle === "monthly" ? "brand-bg text-white" : "text-slate-600"}`}>شهري</button>
          <button onClick={() => setCycle("yearly")} className={`px-6 py-2 rounded-full text-sm font-semibold transition-colors ${cycle === "yearly" ? "brand-bg text-white" : "text-slate-600"}`}>سنوي <span className="text-xs gold-text">(وفّر شهرين)</span></button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
        {plans.map((p) => (
          <div key={p.id} className={`rounded-2xl p-8 bg-white border relative ${p.highlight ? "border-[var(--brand-accent)] soft-shadow-lg md:-translate-y-3" : "border-slate-200 soft-shadow"}`} data-testid={`plan-card-${p.id}`}>
            {p.highlight && <span className="absolute top-4 end-4 text-xs font-bold brand-accent-bg text-white rounded-full px-3 py-1">الأكثر شيوعًا</span>}
            <h3 className="font-head text-2xl font-extrabold brand-text">{p.name}</h3>
            <div className="my-5">
              <span className="text-5xl font-extrabold brand-text">{cycle === "yearly" ? p.price_yearly : p.price_monthly}</span>
              <span className="text-slate-500"> {p.currency}/{cycle === "yearly" ? "سنة" : "شهر"}</span>
            </div>
            <ul className="space-y-3 mb-8">
              {(p.features || []).map((f, i) => <li key={i} className="flex items-start gap-2 text-slate-700 text-sm"><CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" /> {f}</li>)}
              {!p.limits?.custom_domain && <li className="flex items-start gap-2 text-slate-400 text-sm"><XCircle className="w-5 h-5 shrink-0" /> ربط نطاق خاص</li>}
            </ul>
            <Link to="/register"><Button className={`w-full rounded-full py-6 ${p.highlight ? "brand-accent-bg text-white" : "brand-bg text-white"}`} data-testid={`plan-select-${p.id}`}>ابدأ بهذه الباقة</Button></Link>
          </div>
        ))}
      </div>
      <p className="text-center text-slate-500 text-sm mt-10">جميع الأسعار بالريال السعودي (SAR). سيتم تفعيل الدفع بعد ربط بوابة الدفع.</p>
    </div>
  );
}
