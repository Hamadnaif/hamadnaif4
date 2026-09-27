import { useState } from "react";
import { Link } from "react-router-dom";
import { api, apiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import AuthShell from "@/pages/auth/AuthShell";
import { Loader2, CheckCircle2 } from "lucide-react";

export default function Forgot() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setMsg(data.message || "إن كان البريد مسجّلًا فستصلك رسالة.");
      setDone(true);
    } catch (err) {
      setMsg(apiError(err.response?.data?.detail));
      setDone(true);
    }
    setLoading(false);
  };

  return (
    <AuthShell title="استعادة كلمة المرور" subtitle="أدخل بريدك وسنرسل لك رابط إعادة التعيين."
      footer={<><Link to="/login" className="brand-accent-text font-bold">العودة لتسجيل الدخول</Link></>}>
      {done ? (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-6 flex items-start gap-3" data-testid="forgot-done">
          <CheckCircle2 className="w-6 h-6 shrink-0" /><p>{msg} (في بيئة التطوير يُطبع رابط إعادة التعيين في سجل الخادم).</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" data-testid="forgot-form">
          <input required type="email" placeholder="البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[var(--brand-accent)]" data-testid="forgot-email" />
          <Button type="submit" disabled={loading} className="w-full brand-bg text-white rounded-full py-6" data-testid="forgot-submit">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "إرسال الرابط"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
