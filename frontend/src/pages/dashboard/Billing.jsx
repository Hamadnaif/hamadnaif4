import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, apiError } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, CreditCard, Info } from "lucide-react";

export default function Billing() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [plans, setPlans] = useState([]);
  const [cycle, setCycle] = useState("monthly");
  const [subscribing, setSubscribing] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const requestIds = useRef({});

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [o, p] = await Promise.all([api.get("/account/overview"), api.get("/public/plans")]);
      setOverview(o.data); setPlans(p.data);
    } catch (err) { setError(apiError(err.response?.data?.detail)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const subscribe = async (planId) => {
    if (subscribing) return;
    setSubscribing(planId);
    const key = `${planId}:${cycle}`;
    requestIds.current[key] ||= crypto.randomUUID();
    try {
      const { data } = await api.post("/account/subscribe", { plan_id: planId, cycle, request_id: requestIds.current[key] });
      navigate(`/checkout/${data.order.id}`);
    } catch (err) { toast.error(apiError(err.response?.data?.detail)); }
    finally { setSubscribing(""); }
  };

  if (loading) return <div className="grid place-items-center py-20" data-testid="billing-loading"><Loader2 className="w-8 h-8 animate-spin brand-accent-text" aria-label="تحميل بيانات الاشتراك" /></div>;
  if (error) return <div role="alert" className="bg-white rounded-2xl p-6 space-y-4" data-testid="billing-error"><p>{error}</p><Button onClick={load} data-testid="billing-retry">إعادة المحاولة</Button></div>;

  const currentPlan = overview.plan;

  return (
    <div className="space-y-8" data-testid="billing-page">
      <div>
        <h2 className="font-head text-xl font-extrabold brand-text mb-4">اشتراكك الحالي</h2>
        <div className="bg-white rounded-2xl border border-slate-200 soft-shadow p-6">
          {currentPlan ? (
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="text-2xl font-extrabold brand-text" data-testid="billing-current-plan">{currentPlan.name}</div>
                <p className="text-slate-500 text-sm mt-1" data-testid="billing-subscription-status">الحالة: {overview.subscription_status === "active" ? "نشط" : "غير مفعّل"} · {overview.plan_cycle === "yearly" ? "سنوي" : "شهري"}{overview.subscription_payment_mode === "test" && " · اشتراك تجريبي"}</p>
                {overview.subscription_renews_at && <p className="text-sm text-slate-500 mt-2" data-testid="billing-expiry">انتهاء الفترة: {new Date(overview.subscription_renews_at).toLocaleDateString("ar-SA")} — لا يوجد تجديد تلقائي</p>}
              </div>
              <div className="text-end" data-testid="billing-current-price"><div className="text-3xl font-extrabold brand-text">{overview.plan_cycle === "yearly" ? currentPlan.price_yearly : currentPlan.price_monthly} <span className="text-sm text-slate-400">{currentPlan.currency}/{overview.plan_cycle === "yearly" ? "سنة" : "شهر"}</span></div></div>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-slate-600"><Info className="w-5 h-5 brand-accent-text" /> أنت على الباقة المجانية (موقع واحد). قم بالترقية لمزايا أكثر.</div>
          )}
        </div>
      </div>

      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900" data-testid="billing-payment-mode">
        <Info className="w-5 h-5 shrink-0 mt-0.5" />
        <p className="text-sm">Tap Payments هي بوابة الدفع الوحيدة. {overview.payment?.enabled ? "وضع الاختبار مفعّل؛ استخدم بطاقات الاختبار فقط. لا يتم خصم أموال حقيقية ولا يوجد تجديد تلقائي." : "الدفع متوقف حاليًا حتى استكمال إعدادات Tap التجريبية."}</p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-head text-xl font-extrabold brand-text">الترقية</h2>
          <div className="inline-flex bg-white border border-slate-200 rounded-full p-1">
            <button disabled={!!subscribing} onClick={() => setCycle("monthly")} data-testid="billing-monthly" aria-pressed={cycle === "monthly"} className={`px-4 py-1.5 rounded-full text-sm font-semibold ${cycle === "monthly" ? "brand-bg text-white" : "text-slate-600"}`}>شهري</button>
            <button disabled={!!subscribing} onClick={() => setCycle("yearly")} data-testid="billing-yearly" aria-pressed={cycle === "yearly"} className={`px-4 py-1.5 rounded-full text-sm font-semibold ${cycle === "yearly" ? "brand-bg text-white" : "text-slate-600"}`}>سنوي</button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((p) => {
            const isCurrent = currentPlan?.id === p.id && overview.plan_cycle === cycle && overview.subscription_status === "active";
            return (
              <div key={p.id} className={`rounded-2xl p-6 bg-white border ${p.highlight ? "border-[var(--brand-accent)]" : "border-slate-200"} soft-shadow`} data-testid={`billing-plan-${p.id}`}>
                <h3 className="font-head text-lg font-extrabold brand-text">{p.name}</h3>
                <div className="my-3"><span className="text-3xl font-extrabold brand-text">{cycle === "yearly" ? p.price_yearly : p.price_monthly}</span><span className="text-slate-400 text-sm"> {p.currency}/{cycle === "yearly" ? "سنة" : "شهر"}</span></div>
                <ul className="space-y-2 mb-5 text-sm">
                  {(p.features || []).slice(0, 4).map((f) => <li key={f} className="flex items-center gap-2 text-slate-600"><CheckCircle2 className="w-4 h-4 text-green-500" /> {f}</li>)}
                </ul>
                <Button disabled={isCurrent || !!subscribing || !overview.payment?.enabled} onClick={() => subscribe(p.id)} className={`w-full rounded-full ${p.highlight ? "brand-accent-bg" : "brand-bg"} text-white`} data-testid={`billing-subscribe-${p.id}`}>
                  {subscribing === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : isCurrent ? "باقتك الحالية" : "اختيار"}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="font-head text-xl font-extrabold brand-text mb-4 flex items-center gap-2"><CreditCard className="w-5 h-5" /> الفواتير والطلبات</h2>
        <div className="bg-white rounded-2xl border border-slate-200 soft-shadow overflow-x-auto" data-testid="billing-orders">
          {overview.orders.length === 0 ? <p className="p-8 text-center text-slate-500" data-testid="billing-orders-empty">لا توجد طلبات أو فواتير بعد.</p> : (
            <table className="w-full text-sm min-w-[620px]">
              <thead className="bg-slate-50 text-slate-500"><tr><th className="text-start p-3">الطلب</th><th className="text-start p-3">المبلغ</th><th className="text-start p-3">الحالة</th><th className="text-start p-3">التاريخ</th><th className="text-start p-3">الإجراء</th></tr></thead>
              <tbody>
                {overview.orders.map((o) => (
                  <tr key={o.id} className="border-t border-slate-100" data-testid={`billing-order-${o.id}`}>
                    <td className="p-3 font-semibold brand-text">{o.plan_name || o.type}{o.mode === "test" && <span className="block text-xs text-amber-800 font-normal">Tap — تجريبي</span>}</td>
                    <td className="p-3" data-testid={`billing-order-amount-${o.id}`}>{o.amount} {o.currency}</td>
                    <td className="p-3" data-testid={`billing-order-status-${o.id}`}><span className={`text-xs rounded-full px-2 py-1 whitespace-nowrap ${o.status === "paid" && o.fulfilled_at ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800"}`}>{o.status === "paid" ? (o.provider === "tap" && !o.fulfilled_at ? "جارٍ التفعيل" : "مدفوع") : ({ failed: "لم ينجح", cancelled: "ملغى", creating: "جارٍ تجهيز الدفع", verification_required: "يحتاج تحققًا" }[o.status] || "بانتظار الدفع")}</span></td>
                    <td className="p-3 text-slate-500">{new Date(o.created_at).toLocaleDateString("ar-SA")}</td>
                    <td className="p-3">
                      {o.provider === "tap" ? <div className="flex flex-col gap-2">
                        {!["paid", "failed", "cancelled"].includes(o.status) && <Link to={`/checkout/${o.id}`} className="brand-accent-text font-bold" data-testid={`billing-order-pay-${o.id}`}>متابعة الدفع</Link>}
                        <Link to={`/payment/result?order=${o.id}`} className="brand-accent-text" data-testid={`billing-order-check-${o.id}`}>تحقق من النتيجة</Link>
                      </div> : <span className="text-xs text-slate-500">طلب سابق — اختر باقة للدفع عبر Tap</span>}
                    </td>
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
