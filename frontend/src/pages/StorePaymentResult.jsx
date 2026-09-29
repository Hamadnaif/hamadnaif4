import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, apiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
export default function StorePaymentResult() {
  const { orderId } = useParams();
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get("token") || "");
  const check = async () => {
    setBusy(true); setError("");
    try { setResult((await api.post(`/commerce/orders/${orderId}/status`, { token })).data); }
    catch(e) { setError(apiError(e.response?.data?.detail)); }
    finally { setBusy(false); }
  };
  useEffect(() => { check(); /* Token is only an opaque status capability; no redirect data is trusted. */ }, [orderId]); // eslint-disable-line react-hooks/exhaustive-deps
  return <main dir="rtl" className="min-h-screen bg-slate-50 grid place-items-center p-6"><div className="bg-white border rounded-2xl p-8 max-w-lg w-full space-y-5 text-center">
    <h1 className="text-2xl font-extrabold brand-text">{result?.status === "paid" ? "تم تأكيد الدفع التجريبي" : result?.status === "failed" ? "لم تكتمل الدفعة" : "التحقق من الدفع"}</h1>
    <p>رقم الطلب: {orderId}</p><p className="text-amber-700 text-sm">عملية اختبار — لا توجد أموال حقيقية.</p>
    {result && <p>{result.total} {result.currency}</p>}{error && <p role="alert" className="text-red-600">{error}</p>}
    {result?.status !== 'paid' && <Button disabled={busy || !token} onClick={check}>{busy ? "جارٍ التحقق…" : "إعادة التحقق"}</Button>}
  </div></main>;
}
