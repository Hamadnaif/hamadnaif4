import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useBrand } from "@/context/BrandContext";
import { Button } from "@/components/ui/button";
import { Menu, X, LayoutDashboard, Sparkles } from "lucide-react";

const LINKS = [
  { to: "/", label: "الرئيسية" },
  { to: "/templates", label: "القوالب" },
  { to: "/pricing", label: "الباقات" },
  { to: "/domains", label: "النطاقات" },
  { to: "/about", label: "من نحن" },
  { to: "/contact", label: "تواصل معنا" },
];

export default function Navbar() {
  const { user } = useAuth();
  const { settings, logo } = useBrand();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const dashHref = user && user.role === "admin" ? "/admin" : "/dashboard";

  return (
    <header className="sticky top-0 z-50 glass border-b border-slate-200/60" data-testid="navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2" data-testid="navbar-logo">
          {logo ? (
            <img src={logo} alt={settings.platform_name} className="h-8 w-auto" />
          ) : (
            <span className="w-9 h-9 rounded-xl brand-gradient text-white grid place-items-center shadow-md">
              <Sparkles className="w-5 h-5" />
            </span>
          )}
          <span className="font-head font-extrabold text-xl brand-text">{settings.platform_name}</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {LINKS.map((l) => {
            const active = location.pathname === l.to;
            return (
              <Link
                key={l.to}
                to={l.to}
                data-testid={`nav-${l.to === "/" ? "home" : l.to.slice(1)}`}
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  active ? "brand-text bg-slate-100" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden lg:flex items-center gap-2">
          {user ? (
            <Button onClick={() => navigate(dashHref)} className="brand-bg text-white rounded-full" data-testid="nav-dashboard-btn">
              <LayoutDashboard className="w-4 h-4 ms-1" /> لوحة التحكم
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => navigate("/login")} data-testid="nav-login-btn">
                تسجيل الدخول
              </Button>
              <Button onClick={() => navigate("/register")} className="brand-bg text-white rounded-full px-5" data-testid="nav-register-btn">
                ابدأ مجانًا
              </Button>
            </>
          )}
        </div>

        <button className="lg:hidden p-2" onClick={() => setOpen(!open)} data-testid="nav-mobile-toggle" aria-label="القائمة">
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1" data-testid="nav-mobile-menu">
          {LINKS.map((l) => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="block px-3 py-2 rounded-lg text-slate-700 font-semibold hover:bg-slate-50">
              {l.label}
            </Link>
          ))}
          <div className="pt-2 flex gap-2">
            {user ? (
              <Button onClick={() => { setOpen(false); navigate(dashHref); }} className="brand-bg text-white rounded-full flex-1">لوحة التحكم</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => { setOpen(false); navigate("/login"); }} className="flex-1 rounded-full">دخول</Button>
                <Button onClick={() => { setOpen(false); navigate("/register"); }} className="brand-bg text-white rounded-full flex-1">ابدأ مجانًا</Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
