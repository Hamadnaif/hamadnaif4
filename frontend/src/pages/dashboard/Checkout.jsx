import { useEffect, useState } from "react";
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

  useEffect(() => {
    api.get(`/account/payment-session/${orderId}`)
      .then((r) => setSession(r.data))
      .catch((err) => setError(apiError(err.response?.data?.detail) || "تعذّر بدء الدفع"));
  }, [orderId]);

  const pay = async () => {
    setRedirecting(true);
    setError("");
    try {
      const { data } = await api.get(`/payments/neoleap/start/${orderId}`);
      if (!data.redirect_url) throw new Error("no redirect");
      window.location.assign(data.redirect_url);
    } catch (err) {
      setError(apiError(err.response?.data?.detail) || "تعذّر بدء الدفع، حاول مرة أخرى.");
      setRedirecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] py-12 px-4" data-testid="checkout-page">
      <div className="max-w-lg mx-auto">
        <button onClick={() => navigate("/dashboard/billing")} className="flex items-center gap-1 text-slate-500 mb-6"><ArrowRight className="w-4 h-4" /> رجوع</button>
        <div className="bg-white rounded-2xl border border-slate-200 soft-shadow p-6">
          <h1 className="font-head text-2xl font-extrabold brand-text mb-1">إتمام الدفع</h1>
          {session && <p className="text-slate-500 mb-2">{session.description}</p>}
          {session && <p className="font-bold brand-text mb-5">المبلغ: {Number(session.amount).toFixed(2)} {session.currency}</p>}
          {error ? (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-4 text-sm mb-4" data-testid="checkout-error">{error}</div>
          ) : !session ? (
            <div className="grid place-items-center py-10"><Loader2 className="w-8 h-8 animate-spin brand-accent-text" /></div>
          ) : null}
          {session && (
            <Button onClick={pay} disabled={redirecting} className="w-full brand-bg text-white rounded-full py-6" data-testid="checkout-pay-btn">
              {redirecting ? <><Loader2 className="w-5 h-5 animate-spin ms-2" /> جارٍ التحويل للدفع الآمن...</> : <><CreditCard className="w-5 h-5 ms-2" /> المتابعة للدفع الآمن</>}
            </Button>
          )}
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-5"><ShieldCheck className="w-4 h-4" /> الدفع آمن ومشفّر عبر بوابة NeoLeap (مصرف الراجحي). لا نحفظ بيانات بطاقتك.</div>
        </div>
      </div>
    </div>
  );
}
