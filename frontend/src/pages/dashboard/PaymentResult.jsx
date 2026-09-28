import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api, apiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Loader2, CheckCircle2, XCircle, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function PaymentResult() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const order = params.get("order");
  const tapId = params.get("tap_id");
  const [state, setState] = useState("verifying");
  const [message, setMessage] = useState("");
  const verify = useCallback(async () => {
    setState("verifying"); setMessage("");
    if (!tapId && !order) { setState("error"); setMessage("مرجع الدفع غير موجود. لا يمكن تأكيد الدفع من رابط العودة وحده."); return; }
    try {
      const { data } = tapId ? await api.post("/payments/tap/verify", { tap_id: tapId }) : await api.get(`/payments/order-status/${order}`);
      if (data.status === "paid" && data.activated) {
        setState("success");
        api.get("/auth/me").then((r) => setUser(r.data)).catch(() => toast.info("تم تأكيد الدفع، لكن تعذّر تحديث بيانات الحساب مؤقتًا."));
      } else if (data.status === "failed" || data.status === "cancelled") {
        setState(data.status); setMessage("لم يتم خصم مبلغ حقيقي أو تفعيل باقة من هذه المحاولة.");
      } else { setState("pending"); setMessage("لم تؤكد Tap اكتمال الدفع بعد. يمكنك إعادة التحقق من نفس الطلب دون إنشاء دفعة أخرى."); }
    } catch (err) { setState("error"); setMessage(apiError(err.response?.data?.detail)); }
  }, [order, tapId, setUser]);
  useEffect(() => { verify(); }, [verify]);

  const titles = { success: "نجح الدفع التجريبي", failed: "لم ينجح الدفع", cancelled: "أُلغي الدفع", pending: "بانتظار تأكيد Tap", error: "تعذّر التحقق من الدفع" };
  return (
    <div className="platform-ui min-h-screen grid place-items-center px-4 py-12" data-testid="payment-result">
      <div className="bg-white rounded-2xl border border-slate-200 soft-shadow p-8 text-center max-w-md w-full">
        <p className="text-amber-800 bg-amber-50 rounded-lg p-2 text-sm mb-6" data-testid="payment-result-test-mode">Tap Payments — اختبار فقط، لا توجد أموال حقيقية</p>
        {state === "verifying" ? <><Loader2 className="w-12 h-12 animate-spin brand-accent-text mx-auto mb-4" /><p data-testid="payment-verifying">جارٍ التحقق من Tap...</p></> : <>
          {state === "success" ? <CheckCircle2 className="w-14 h-14 text-green-600 mx-auto mb-4" /> : state === "pending" ? <Clock3 className="w-14 h-14 text-amber-600 mx-auto mb-4" /> : <XCircle className="w-14 h-14 text-red-500 mx-auto mb-4" />}
          <h1 className="font-head text-2xl font-extrabold brand-text mb-3" data-testid="payment-result-status">{titles[state]}</h1>
          <p className="text-slate-600 mb-6" data-testid="payment-result-message">{state === "success" ? "تم تأكيد العملية من Tap وتفعيل باقتك التجريبية مرة واحدة. لا يوجد تجديد تلقائي." : message}</p>
          {(state === "pending" || state === "error") && (tapId || order) && <Button onClick={verify} variant="outline" className="mb-3 w-full rounded-xl" data-testid="payment-verify-again">إعادة التحقق</Button>}
          <Button onClick={() => navigate("/dashboard/billing")} className="brand-accent-bg text-white w-full rounded-xl" data-testid="payment-back-billing">العودة للباقات والفواتير</Button>
        </>}
      </div>
    </div>
  );
}
