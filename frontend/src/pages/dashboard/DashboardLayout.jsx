import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useBrand } from "@/context/BrandContext";
import { LayoutGrid, CreditCard, Globe, User, LogOut, Sparkles, ExternalLink, ShoppingBag } from "lucide-react";

const NAV = [
  { to: "/dashboard", label: "مواقعي", icon: LayoutGrid },
  { to: "/dashboard/orders", label: "طلبات المتجر", icon: ShoppingBag },
  { to: "/dashboard/billing", label: "الاشتراك والفواتير", icon: CreditCard },
  { to: "/dashboard/domains", label: "النطاقات", icon: Globe },
  { to: "/dashboard/profile", label: "الملف الشخصي", icon: User },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { settings } = useBrand();
  const location = useLocation();
  const navigate = useNavigate();

  const doLogout = async () => { await logout(); navigate("/"); };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex" data-testid="dashboard-layout">
      <aside className="w-64 shrink-0 bg-white border-e border-slate-200 hidden md:flex flex-col fixed inset-y-0 end-0 md:static">
        <Link to="/" className="flex items-center gap-2 h-16 px-6 border-b border-slate-200">
          <span className="w-8 h-8 rounded-lg brand-bg text-white grid place-items-center"><Sparkles className="w-4 h-4" /></span>
          <span className="font-head font-extrabold text-lg brand-text">{settings.platform_name}</span>
        </Link>
        <nav className="flex-1 p-4 space-y-1">
          {NAV.map((n) => {
            const active = location.pathname === n.to;
            return (
              <Link key={n.to} to={n.to} data-testid={`dash-nav-${n.to.split("/").pop()}`}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-colors ${active ? "brand-bg text-white" : "text-slate-600 hover:bg-slate-50"}`}>
                <n.icon className="w-5 h-5" /> {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-200 space-y-1">
          <Link to="/" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 text-sm"><ExternalLink className="w-4 h-4" /> عرض الموقع</Link>
          <button onClick={doLogout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-red-600 hover:bg-red-50 text-sm" data-testid="dash-logout"><LogOut className="w-4 h-4" /> تسجيل الخروج</button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="md:hidden glass border-b border-slate-200 h-14 flex items-center justify-between px-4 sticky top-0 z-40">
          <span className="font-head font-extrabold brand-text">{settings.platform_name}</span>
          <button onClick={doLogout} className="text-red-600"><LogOut className="w-5 h-5" /></button>
        </header>
        <nav className="md:hidden flex overflow-x-auto no-scrollbar gap-1 p-2 bg-white border-b border-slate-200">
          {NAV.map((n) => {
            const active = location.pathname === n.to;
            return <Link key={n.to} to={n.to} className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap ${active ? "brand-bg text-white" : "text-slate-600"}`}>{n.label}</Link>;
          })}
        </nav>
        <div className="p-4 sm:p-8 max-w-6xl mx-auto">
          <div className="mb-6 hidden md:block">
            <p className="text-slate-500 text-sm">أهلًا،</p>
            <h1 className="font-head text-2xl font-extrabold brand-text">{user?.name}</h1>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
