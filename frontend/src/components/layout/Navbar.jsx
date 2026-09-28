import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Menu, X, LayoutDashboard, ArrowLeft } from "lucide-react";

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
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const dashHref = user?.role === "admin" ? "/admin" : "/dashboard";
  const go = (to) => { setOpen(false); navigate(to); };

  return (
    <header className="sticky top-0 z-50 glass border-b border-slate-200/70" data-testid="navbar">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 flex items-center justify-between h-20 gap-6">
        <Link to="/" onClick={() => setOpen(false)} aria-label="منصتي — الرئيسية" data-testid="navbar-logo">
          <BrandLogo testId="navbar-brand-image" />
        </Link>
        <nav className="hidden lg:flex items-center gap-1" aria-label="التنقل الرئيسي">
          {LINKS.map((l) => (
            <Link key={l.to} to={l.to} aria-current={location.pathname === l.to ? "page" : undefined}
              data-testid={`nav-${l.to === "/" ? "home" : l.to.slice(1)}`}
              className={`px-3 py-2 rounded-lg text-sm font-bold transition-colors ${location.pathname === l.to ? "brand-accent-text bg-blue-50" : "text-slate-600 hover:text-blue-700 hover:bg-blue-50/50"}`}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden lg:flex items-center gap-3">
          {user ? (
            <Button onClick={() => go(dashHref)} className="brand-accent-bg text-white rounded-xl" data-testid="nav-dashboard-btn"><LayoutDashboard /> لوحة التحكم</Button>
          ) : <>
            <Button variant="ghost" onClick={() => go("/login")} className="rounded-xl" data-testid="nav-login-btn">تسجيل الدخول</Button>
            <Button onClick={() => go("/register")} className="brand-accent-bg text-white rounded-xl px-5 h-11" data-testid="nav-register-btn">ابدأ مجانًا <ArrowLeft /></Button>
          </>}
        </div>
        <button className="lg:hidden p-3 rounded-xl text-slate-700 hover:bg-blue-50 transition-colors" onClick={() => setOpen(!open)}
          data-testid="nav-mobile-toggle" aria-label={open ? "إغلاق القائمة" : "فتح القائمة"} aria-expanded={open} aria-controls="mobile-navigation">
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>
      {open && (
        <nav id="mobile-navigation" className="lg:hidden border-t border-slate-200 bg-white px-5 py-4 space-y-1" data-testid="nav-mobile-menu" aria-label="التنقل على الجوال">
          {LINKS.map((l) => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)} data-testid={`mobile-nav-${l.to === "/" ? "home" : l.to.slice(1)}`}
              aria-current={location.pathname === l.to ? "page" : undefined}
              className={`block px-3 py-3 rounded-lg font-semibold transition-colors ${location.pathname === l.to ? "bg-blue-50 brand-accent-text" : "text-slate-700 hover:bg-slate-50"}`}>{l.label}</Link>
          ))}
          <div className="pt-3 flex gap-2">
            {user ? <Button onClick={() => go(dashHref)} className="brand-accent-bg text-white rounded-xl flex-1" data-testid="mobile-dashboard-btn">لوحة التحكم</Button> : <>
              <Button variant="outline" onClick={() => go("/login")} className="flex-1 rounded-xl" data-testid="mobile-login-btn">دخول</Button>
              <Button onClick={() => go("/register")} className="brand-accent-bg text-white rounded-xl flex-1" data-testid="mobile-register-btn">ابدأ مجانًا</Button>
            </>}
          </div>
        </nav>
      )}
    </header>
  );
}
