import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { apiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import AuthShell, { GoogleButton } from "@/pages/auth/AuthShell";
import { Loader2 } from "lucide-react";

export default function Register() {
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate(user.role === "admin" ? "/admin" : "/dashboard", { replace: true });
  }, [user, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(apiError(err.response?.data?.detail) || err.message);
    }
    setLoading(false);
  };

  return (
    <AuthShell title="إنشاء حساب" subtitle="ابدأ رحلتك وأنشئ موقعك الأول مجانًا."
      footer={<>لديك حساب بالفعل؟ <Link to="/login" className="brand-accent-text font-bold">سجّل الدخول</Link></>}>
      <form onSubmit={submit} className="space-y-4" data-testid="register-form">
        {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm" data-testid="register-error">{error}</div>}
        <input required placeholder="الاسم الكامل" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[var(--brand-accent)]" data-testid="register-name" />
        <input required type="email" placeholder="البريد الإلكتروني" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[var(--brand-accent)]" data-testid="register-email" />
        <input required type="password" placeholder="كلمة المرور (6 أحرف على الأقل)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[var(--brand-accent)]" data-testid="register-password" />
        <Button type="submit" disabled={loading} className="w-full brand-bg text-white rounded-full py-6" data-testid="register-submit">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "إنشاء الحساب"}
        </Button>
      </form>
      <div className="flex items-center gap-3 my-6"><div className="flex-1 h-px bg-slate-200" /><span className="text-slate-400 text-sm">أو</span><div className="flex-1 h-px bg-slate-200" /></div>
      <GoogleButton label="التسجيل عبر Google" />
    </AuthShell>
  );
}
