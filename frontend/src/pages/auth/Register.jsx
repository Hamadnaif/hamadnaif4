import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api, apiError } from "@/lib/api";
import { usePageMeta } from "@/lib/usePageMeta";
import { Button } from "@/components/ui/button";
import { Loader2, BadgeCheck } from "lucide-react";
import AuthShell, { GoogleButton } from "@/pages/auth/AuthShell";

export default function Register() {
  usePageMeta("إنشاء حساب", "أنشئ حسابك المجاني في منصتي وابدأ ببناء موقعك الإلكتروني الأول خلال دقائق.", { noindex: true });
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const planId = params.get("plan");
  const cycle = params.get("cycle") === "yearly" ? "yearly" : "monthly";
  const [plan, setPlan] = useState(null);

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate(user.role === "admin" ? "/admin" : "/dashboard", { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    if (!planId) return;
    api.get("/public/plans").then((r) => {
      const found = (r.data || []).find((p) => p.id === planId);
      if (found) {
        setPlan(found);
        try { localStorage.setItem("selected_plan", JSON.stringify({ id: found.id, cycle })); } catch { /* ignore */ }
      }
    }).catch(() => {});
  }, [planId, cycle]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      navigate(plan ? "/dashboard/billing" : "/dashboard", { replace: true });
    } catch (err) {
      setError(apiError(err.response?.data?.detail) || err.message);
    }
    setLoading(false);
  };

  return (
    <AuthShell title="إنشاء حساب" subtitle="ابدأ رحلتك وأنشئ موقعك الأول مجانًا."
      footer={<>لديك حساب بالفعل؟ <Link to="/login" className="brand-accent-text font-bold">سجّل الدخول</Link></>}>

      {plan && (
        <div className="mb-5 rounded-xl border border-[var(--brand-accent)] bg-blue-50/50 p-4" data-testid="register-plan-summary">
          <div className="flex items-center gap-2 text-sm font-bold brand-text mb-1"><BadgeCheck className="w-4 h-4 brand-accent-text" /> الباقة المختارة</div>
          <div className="flex items-center justify-between">
            <span className="text-slate-700">{plan.name} · <span className="text-slate-500">{cycle === "yearly" ? "سنوي" : "شهري"}</span></span>
            <span className="font-extrabold brand-text">{cycle === "yearly" ? plan.price_yearly : plan.price_monthly} {plan.currency}<span className="text-xs text-slate-400">/{cycle === "yearly" ? "سنة" : "شهر"}</span></span>
          </div>
          <p className="text-xs text-slate-500 mt-2">أنشئ حسابك مجانًا الآن، وستُتاح ترقية هذه الباقة من صفحة الفوترة بعد تفعيل الدفع.</p>
        </div>
      )}

      <form onSubmit={submit} className="space-y-4" data-testid="register-form">
        {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm" data-testid="register-error">{error}</div>}
        <div>
          <label htmlFor="reg-name" className="block text-sm font-semibold text-slate-600 mb-1">الاسم الكامل</label>
          <input id="reg-name" required autoComplete="name" placeholder="مثال: أحمد العتيبي" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[var(--brand-accent)] focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)]" data-testid="register-name" />
        </div>
        <div>
          <label htmlFor="reg-email" className="block text-sm font-semibold text-slate-600 mb-1">البريد الإلكتروني</label>
          <input id="reg-email" required type="email" autoComplete="email" dir="ltr" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[var(--brand-accent)] focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)]" data-testid="register-email" />
        </div>
        <div>
          <label htmlFor="reg-password" className="block text-sm font-semibold text-slate-600 mb-1">كلمة المرور</label>
          <input id="reg-password" required type="password" minLength={6} autoComplete="new-password" placeholder="٦ أحرف على الأقل" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[var(--brand-accent)] focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)]" data-testid="register-password" />
        </div>
        <Button type="submit" disabled={loading} className="w-full brand-bg text-white rounded-full py-6" data-testid="register-submit">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "إنشاء الحساب"}
        </Button>
        <p className="text-xs text-slate-500 text-center leading-relaxed">
          بإنشائك الحساب فإنك توافق على <Link to="/terms" className="brand-accent-text font-semibold">الشروط والأحكام</Link> و<Link to="/privacy" className="brand-accent-text font-semibold">سياسة الخصوصية</Link>.
        </p>
      </form>
      <div className="flex items-center gap-3 my-6"><div className="flex-1 h-px bg-slate-200" /><span className="text-slate-400 text-sm">أو</span><div className="flex-1 h-px bg-slate-200" /></div>
      <GoogleButton label="التسجيل عبر Google" />
    </AuthShell>
  );
}
