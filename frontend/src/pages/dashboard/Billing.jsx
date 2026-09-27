import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, apiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, CreditCard, Info } from "lucide-react";

export default function Billing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [plans, setPlans] = useState([]);
  const [cycle, setCycle] = useState("monthly");
  const [subscribing, setSubscribing] = useState("");

  const load = async () => {
    try {
      const [o, p] = await Promise.all([api.get("/account/overview"), api.get("/public/plans")]);
      setOverview(o.data); setPlans(p.data);
    } catch { /* ignore */ }
  };
  useEffect(() => { load(); }, []);

  const subscribe = async (planId) => {
    setSubscribing(planId);
    try {
      const { data } = await api.post("/account/subscribe", { plan_id: planId, cycle });
      if (data.payment_enabled && data.order?.id) {
        navigate(`/checkout/${data.order.id}`);
        return;
      }
      toast.info(data.message, { duration: 6000 });
    } catch (err) { toast.error(apiError(err.response?.data?.detail)); }
    setSubscribing("");
  };

  if (!overview) return <div className="grid place-items-center py-20"><Loader2 className="w-8 h-8 animate-spin brand-accent-text" /></div>;

  const currentPlan = overview.plan;

  return (
    <div className="space-y-8" data-testid="billing-page">
      <div>
        <h2 className="font-head text-xl font-extrabold brand-text mb-4">اشتراكك الحالي</h2>
        <div className="bg-white rounded-2xl border border-slate-200 soft-shadow p-6">
          {currentPlan ? (
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="text-2xl font-extrabold brand-text">{currentPlan.name}</div>
                <p className="text-slate-500 text-sm mt-1">الحالة: {overview.subscription_status === "active" ? "نشط" : "غير مفعّل"} · {overview.plan_cycle === "yearly" ? "سنوي" : "شهري"}</p>
              </div>
              <div className="text-end"><div className="text-3xl font-extrabold brand-text">{currentPlan.price_monthly} <span className="text-sm text-slate-400">{currentPlan.currency}/شهر</span></div></div>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-slate-600"><Info className="w-5 h-5 brand-accent-text" /> أنت على الباقة المجانية (موقع واحد). قم بالترقية لمزايا أكثر.</div>
          )}
        </div>
      </div>

      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800">
        <Info className="w-5 h-5 shrink-0 mt-0.5" />
        <p className="text-sm">بوابة الدفع (Moyasar) لم تُربط بعد. الاشتراك الحقيقي معطّل حتى إضافة مفاتيح التاجر. الأسعار تجريبية وقابلة للتعديل.</p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-head text-xl font-extrabold brand-text">الترقية</h2>
          <div className="inline-flex bg-white border border-slate-200 rounded-full p-1">
            <button onClick={() => setCycle("monthly")} className={`px-4 py-1.5 rounded-full text-sm font-semibold ${cycle === "monthly" ? "brand-bg text-white" : "text-slate-600"}`}>شهري</button>
            <button onClick={() => setCycle("yearly")} className={`px-4 py-1.5 rounded-full text-sm font-semibold ${cycle === "yearly" ? "brand-bg text-white" : "text-slate-600"}`}>سنوي</button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((p) => {
            const isCurrent = currentPlan?.id === p.id;
            return (
              <div key={p.id} className={`rounded-2xl p-6 bg-white border ${p.highlight ? "border-[var(--brand-accent)]" : "border-slate-200"} soft-shadow`} data-testid={`billing-plan-${p.id}`}>
                <h3 className="font-head text-lg font-extrabold brand-text">{p.name}</h3>
                <div className="my-3"><span className="text-3xl font-extrabold brand-text">{cycle === "yearly" ? p.price_yearly : p.price_monthly}</span><span className="text-slate-400 text-sm"> {p.currency}/{cycle === "yearly" ? "سنة" : "شهر"}</span></div>
                <ul className="space-y-2 mb-5 text-sm">
                  {(p.features || []).slice(0, 4).map((f, i) => <li key={i} className="flex items-center gap-2 text-slate-600"><CheckCircle2 className="w-4 h-4 text-green-500" /> {f}</li>)}
                </ul>
                <Button disabled={isCurrent || subscribing === p.id} onClick={() => subscribe(p.id)} className={`w-full rounded-full ${p.highlight ? "brand-accent-bg" : "brand-bg"} text-white`} data-testid={`billing-subscribe-${p.id}`}>
                  {subscribing === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : isCurrent ? "باقتك الحالية" : "اختيار"}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="font-head text-xl font-extrabold brand-text mb-4 flex items-center gap-2"><CreditCard className="w-5 h-5" /> الفواتير والطلبات</h2>
        <div className="bg-white rounded-2xl border border-slate-200 soft-shadow overflow-hidden">
          {overview.orders.length === 0 ? (
            <p className="p-8 text-center text-slate-400">لا توجد طلبات أو فواتير بعد.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500"><tr><th className="text-start p-3">الطلب</th><th className="text-start p-3">المبلغ</th><th className="text-start p-3">الحالة</th><th className="text-start p-3">التاريخ</th></tr></thead>
              <tbody>
                {overview.orders.map((o) => (
                  <tr key={o.id} className="border-t border-slate-100">
                    <td className="p-3 font-semibold brand-text">{o.plan_name || o.type}</td>
                    <td className="p-3">{o.amount} {o.currency}</td>
                    <td className="p-3"><span className="text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-1">{o.status === "pending_payment" ? "بانتظار الدفع" : o.status}</span></td>
                    <td className="p-3 text-slate-400">{new Date(o.created_at).toLocaleDateString("ar-SA")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
