import { Link } from "react-router-dom";
import { useBrand } from "@/context/BrandContext";
import { Sparkles } from "lucide-react";

export default function AuthShell({ title, subtitle, children, footer }) {
  const { settings } = useBrand();
  return (
    <div className="min-h-screen grid lg:grid-cols-2" data-testid="auth-shell">
      <div className="hidden lg:flex flex-col justify-between brand-bg text-white p-12 relative overflow-hidden">
        <div className="absolute -top-24 -start-24 w-96 h-96 rounded-full" style={{ background: "radial-gradient(circle, rgba(212,175,55,0.3), transparent 70%)" }} />
        <Link to="/" className="flex items-center gap-2 relative">
          <span className="w-9 h-9 rounded-xl bg-white/10 grid place-items-center"><Sparkles className="w-5 h-5 gold-text" /></span>
          <span className="font-head font-extrabold text-2xl">{settings.platform_name}</span>
        </Link>
        <div className="relative">
          <h2 className="font-head text-4xl font-extrabold leading-tight mb-4">ابنِ حضورك الرقمي<br /><span className="gold-text">باحترافية عربية</span></h2>
          <p className="text-white/80 text-lg max-w-md">قوالب جاهزة، محرّر بسيط، ونشر فوري — كل ما تحتاجه لإطلاق موقعك.</p>
        </div>
        <p className="text-white/50 text-sm relative">© {new Date().getFullYear()} {settings.platform_name}</p>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-12 bg-[#FAFAFA]">
        <div className="w-full max-w-md">
          <Link to="/" className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <span className="w-9 h-9 rounded-xl brand-bg text-white grid place-items-center"><Sparkles className="w-5 h-5" /></span>
            <span className="font-head font-extrabold text-2xl brand-text">{settings.platform_name}</span>
          </Link>
          <h1 className="font-head text-3xl font-extrabold brand-text mb-2">{title}</h1>
          {subtitle && <p className="text-slate-500 mb-8">{subtitle}</p>}
          {children}
          {footer && <div className="mt-6 text-center text-slate-600 text-sm">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export function googleLogin() {
  const redirectUrl = window.location.origin + "/dashboard";
  window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
}

export function GoogleButton({ label = "المتابعة عبر Google" }) {
  return (
    <button type="button" onClick={googleLogin} data-testid="google-login-btn"
      className="w-full flex items-center justify-center gap-3 border border-slate-300 bg-white rounded-full py-3 font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
      <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
      {label}
    </button>
  );
}
