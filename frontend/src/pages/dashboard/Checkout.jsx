import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, apiError } from "@/lib/api";
import { Loader2, ShieldCheck, ArrowRight, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Checkout() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [error, setError] = useState("");
  const [redirecting, setRedirecting] = useState(false);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true); setError(""); setSession(null);
    try { setSession((await api.get(`/account/payment-session/${orderId}`)).data); }
    catch (err) { setError(apiError(err.response?.data?.detail)); }
    finally { setLoading(false); }
  }, [orderId]);
  useEffect(() => { load(); }, [load]);

  const pay = async () => {
    if (redirecting) return;
    setRedirecting(true); setError("");
    try {
      const { data } = await api.post(`/payments/tap/start/${orderId}`);
      if (data.completed) { navigate(`/payment/result?order=${orderId}`, { replace: true }); return; }
      if (!data.redirect_url) throw new Error("Missing checkout URL");
      window.location.assign(data.redirect_url);
    } catch (err) {
      setError(apiError(err.response?.data?.detail));
      setRedirecting(false);
    }
  };

  return (
    <div className="platform-ui min-h-screen py-12 px-4" data-testid="checkout-page">
      <div className="max-w-lg mx-auto">
        <button onClick={() => navigate("/dashboard/billing")} className="flex items-center gap-1 text-slate-500 mb-6" data-testid="checkout-back"><ArrowRight className="w-4 h-4" /> رجوع</button>
        <div className="bg-white rounded-2xl border border-slate-200 soft-shadow p-6">
          <h1 className="font-head text-2xl font-extrabold brand-text mb-3" data-testid="checkout-title">الدفع عبر Tap</h1>
          <p className="bg-amber-50 text-amber-900 rounded-xl p-3 text-sm mb-5" data-testid="checkout-test-mode">وضع الاختبار فقط — لا تستخدم بطاقة حقيقية، ولن يتم خصم أموال فعلية.</p>
          {session && <><p className="text-slate-500 mb-2" data-testid="checkout-description">{session.description}</p><p className="font-bold brand-text mb-5" data-testid="checkout-amount">المبلغ التجريبي: {Number(session.amount).toFixed(2)} {session.currency}</p></>}
          {error && <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm mb-4" data-testid="checkout-error">{error}</div>}
          {loading && <div className="grid place-items-center py-10" data-testid="checkout-loading"><Loader2 className="w-8 h-8 animate-spin brand-accent-text" aria-label="تحميل الطلب" /></div>}
          {!loading && !session && <Button onClick={load} variant="outline" data-testid="checkout-retry">إعادة تحميل الطلب</Button>}
          {session && <>
            {!session.enabled && <p className="text-red-700 mb-3" data-testid="checkout-disabled">الدفع عبر Tap متوقف حاليًا.</p>}
            {session.status === "paid" ? <Button onClick={() => navigate(`/payment/result?order=${orderId}`)} data-testid="checkout-view-result">عرض نتيجة الدفع</Button> :
              <Button onClick={pay} disabled={redirecting || !session.enabled} className="w-full brand-accent-bg text-white rounded-xl py-6" data-testid="checkout-pay-btn">
                {redirecting ? <><Loader2 className="w-5 h-5 animate-spin" /> جارٍ التحويل إلى Tap...</> : <><CreditCard className="w-5 h-5" /> المتابعة إلى Tap — اختبار</>}
              </Button>}
          </>}
          <div className="flex items-start gap-2 text-xs text-slate-500 mt-5" data-testid="checkout-provider-note"><ShieldCheck className="w-4 h-4 shrink-0" /> ستدخل بيانات بطاقة الاختبار على صفحة Tap المستضافة. لا نحفظ بيانات بطاقتك.</div>
        </div>
      </div>
    </div>
  );
}
