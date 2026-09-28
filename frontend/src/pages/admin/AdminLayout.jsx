import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { BrandLogo } from "@/components/BrandLogo";
import { LayoutDashboard, Users, LayoutTemplate, CreditCard, Settings, Inbox, ScrollText, LogOut, Globe } from "lucide-react";

const NAV = [
  { to: "/admin", label: "لوحة القيادة", icon: LayoutDashboard },
  { to: "/admin/customers", label: "العملاء", icon: Users },
  { to: "/admin/templates", label: "القوالب", icon: LayoutTemplate },
  { to: "/admin/plans", label: "الباقات", icon: CreditCard },
  { to: "/admin/contacts", label: "رسائل التواصل", icon: Inbox },
  { to: "/admin/settings", label: "إعدادات المنصة", icon: Settings },
  { to: "/admin/audit", label: "سجل الإجراءات", icon: ScrollText },
];

export default function AdminLayout() {
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const doLogout = async () => { await logout(); navigate("/"); };

  return (
    <div className="platform-ui min-h-screen identity-dark flex" data-testid="admin-layout">
      <aside className="w-64 shrink-0 identity-dark border-e border-white/10 hidden md:flex flex-col text-white">
        <Link to="/" className="flex items-center gap-3 h-24 px-6 border-b border-white/10" data-testid="admin-brand-home">
          <BrandLogo light testId="admin-brand-logo" />
        </Link>
        <p className="px-8 pt-6 pb-1 text-xs text-blue-200 font-bold">إدارة المنصة</p>
        <nav className="flex-1 p-4 space-y-1">
          {NAV.map((n) => {
            const active = location.pathname === n.to;
            return <Link key={n.to} to={n.to} data-testid={`admin-nav-${n.to.split("/").pop() || "home"}`}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-colors ${active ? "brand-accent-bg text-white" : "text-white/70 hover:bg-white/5"}`}>
              <n.icon className="w-5 h-5" /> {n.label}</Link>;
          })}
        </nav>
        <div className="p-4 border-t border-white/10 space-y-1">
          <Link to="/" data-testid="admin-view-platform" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-white/70 hover:bg-white/5 text-sm"><Globe className="w-4 h-4" /> عرض الموقع</Link>
          <button onClick={doLogout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-red-300 hover:bg-red-500/10 text-sm" data-testid="admin-logout"><LogOut className="w-4 h-4" /> خروج</button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 bg-[var(--platform-surface)] md:rounded-s-3xl overflow-hidden">
        <header className="md:hidden identity-dark text-white flex items-center justify-between h-20 px-5">
          <Link to="/" data-testid="admin-mobile-brand-home"><BrandLogo light testId="admin-mobile-brand-logo" /></Link>
          <button onClick={doLogout} className="p-3 text-red-200" aria-label="تسجيل الخروج" data-testid="admin-mobile-logout"><LogOut className="w-5 h-5" /></button>
        </header>
        <nav className="md:hidden flex overflow-x-auto no-scrollbar gap-1 p-2 identity-dark">
          {NAV.map((n) => <Link key={n.to} to={n.to} data-testid={`admin-mobile-nav-${n.to.split("/").pop()}`} aria-current={location.pathname === n.to ? "page" : undefined} className={`px-3 py-2 rounded-lg text-xs whitespace-nowrap ${location.pathname === n.to ? "brand-accent-bg text-white" : "text-white/70"}`}>{n.label}</Link>)}
        </nav>
        <div className="p-4 sm:p-8 max-w-6xl mx-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
