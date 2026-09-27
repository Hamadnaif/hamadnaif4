import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { apiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import AuthShell, { GoogleButton } from "@/pages/auth/AuthShell";
import { Loader2 } from "lucide-react";

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      const u = await login(email, password);
      navigate(u.role === "admin" ? "/admin" : "/dashboard", { replace: true });
    } catch (err) {
      setError(apiError(err.response?.data?.detail) || err.message);
    }
    setLoading(false);
  };

  return (
    <AuthShell title="تسجيل الدخول" subtitle="مرحبًا بعودتك، أدخل بياناتك للمتابعة."
      footer={<>ليس لديك حساب؟ <Link to="/register" className="brand-accent-text font-bold">أنشئ حسابًا</Link></>}>
      <form onSubmit={submit} className="space-y-4" data-testid="login-form">
        {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm" data-testid="login-error">{error}</div>}
        <input required type="email" placeholder="البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[var(--brand-accent)]" data-testid="login-email" />
        <input required type="password" placeholder="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[var(--brand-accent)]" data-testid="login-password" />
        <div className="text-end"><Link to="/forgot-password" className="text-sm text-slate-500 hover:brand-accent-text">نسيت كلمة المرور؟</Link></div>
        <Button type="submit" disabled={loading} className="w-full brand-bg text-white rounded-full py-6" data-testid="login-submit">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "دخول"}
        </Button>
      </form>
      <div className="flex items-center gap-3 my-6"><div className="flex-1 h-px bg-slate-200" /><span className="text-slate-400 text-sm">أو</span><div className="flex-1 h-px bg-slate-200" /></div>
      <GoogleButton label="تسجيل الدخول عبر Google" />
    </AuthShell>
  );
}
