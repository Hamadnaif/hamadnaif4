import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api, apiError } from "@/lib/api";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PaymentResult() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState("verifying"); // verifying | success | failed
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const id = params.get("id");
    if (!id) { setState("failed"); setMsg("لا يوجد معرّف دفعة"); return; }
    api.get(`/payments/verify`, { params: { id } })
      .then((r) => {
        if (r.data.status === "fulfilled" || r.data.status === "already_processed") {
          setState("success");
        } else { setState("failed"); setMsg("لم يكتمل الدفع"); }
      })
      .catch((err) => { setState("failed"); setMsg(apiError(err.response?.data?.detail) || "فشل التحقق من الدفع"); });
  }, [params]);

  return (
    <div className="min-h-screen grid place-items-center bg-[#FAFAFA] px-4" data-testid="payment-result">
      <div className="bg-white rounded-2xl border border-slate-200 soft-shadow p-10 text-center max-w-md w-full">
        {state === "verifying" && <><Loader2 className="w-12 h-12 animate-spin brand-accent-text mx-auto mb-4" /><p className="text-slate-600">جارٍ التحقق من الدفع...</p></>}
        {state === "success" && <>
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="font-head text-2xl font-extrabold brand-text mb-2">تم الدفع بنجاح</h1>
          <p className="text-slate-500 mb-6">تم تفعيل اشتراكك. شكرًا لك!</p>
          <Button onClick={() => navigate("/dashboard/billing")} className="brand-bg text-white rounded-full px-8" data-testid="payment-back-billing">العودة للاشتراك</Button>
        </>}
        {state === "failed" && <>
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="font-head text-2xl font-extrabold brand-text mb-2">تعذّر إتمام الدفع</h1>
          <p className="text-slate-500 mb-6">{msg}</p>
          <Button onClick={() => navigate("/dashboard/billing")} className="brand-bg text-white rounded-full px-8">المحاولة مرة أخرى</Button>
        </>}
      </div>
    </div>
  );
}
