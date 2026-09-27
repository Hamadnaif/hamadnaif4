import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { api, apiError } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import AuthShell from "@/pages/auth/AuthShell";
import { Loader2 } from "lucide-react";

export default function Reset() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState(params.get("token") || "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      toast.success("تم تغيير كلمة المرور بنجاح");
      navigate("/login", { replace: true });
    } catch (err) {
      setError(apiError(err.response?.data?.detail));
    }
    setLoading(false);
  };

  return (
    <AuthShell title="تعيين كلمة مرور جديدة" subtitle="أدخل رمز إعادة التعيين وكلمة المرور الجديدة."
      footer={<><Link to="/login" className="brand-accent-text font-bold">العودة لتسجيل الدخول</Link></>}>
      <form onSubmit={submit} className="space-y-4" data-testid="reset-form">
        {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">{error}</div>}
        <input required placeholder="رمز إعادة التعيين" value={token} onChange={(e) => setToken(e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[var(--brand-accent)]" data-testid="reset-token" />
        <input required type="password" placeholder="كلمة المرور الجديدة" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[var(--brand-accent)]" data-testid="reset-password" />
        <Button type="submit" disabled={loading} className="w-full brand-bg text-white rounded-full py-6" data-testid="reset-submit">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "تغيير كلمة المرور"}
        </Button>
      </form>
    </AuthShell>
  );
}
