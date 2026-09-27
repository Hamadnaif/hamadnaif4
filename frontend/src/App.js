import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { BrandProvider } from "@/context/BrandContext";
import { Toaster } from "@/components/ui/sonner";

import PublicLayout from "@/components/layout/PublicLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import AuthCallback from "@/components/AuthCallback";

import Home from "@/pages/marketing/Home";
import Templates from "@/pages/marketing/Templates";
import Pricing from "@/pages/marketing/Pricing";
import DomainSearch from "@/pages/marketing/DomainSearch";
import About from "@/pages/marketing/About";
import Contact from "@/pages/marketing/Contact";
import Legal from "@/pages/marketing/Legal";

import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import Forgot from "@/pages/auth/Forgot";
import Reset from "@/pages/auth/Reset";

import DashboardLayout from "@/pages/dashboard/DashboardLayout";
import Sites from "@/pages/dashboard/Sites";
import Billing from "@/pages/dashboard/Billing";
import Domains from "@/pages/dashboard/Domains";
import StoreOrders from "@/pages/dashboard/StoreOrders";
import Profile from "@/pages/dashboard/Profile";
import Checkout from "@/pages/dashboard/Checkout";
import PaymentResult from "@/pages/dashboard/PaymentResult";
import Editor from "@/pages/editor/Editor";

import AdminLayout from "@/pages/admin/AdminLayout";
import AdminHome from "@/pages/admin/AdminHome";
import AdminCustomers from "@/pages/admin/AdminCustomers";
import AdminTemplates from "@/pages/admin/AdminTemplates";
import AdminPlans from "@/pages/admin/AdminPlans";
import AdminSettings from "@/pages/admin/AdminSettings";
import AdminContacts from "@/pages/admin/AdminContacts";
import AdminAudit from "@/pages/admin/AdminAudit";

import PublicSite from "@/pages/PublicSite";
import NotFound from "@/pages/NotFound";

function AppRouter() {
  const location = useLocation();
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/domains" element={<DomainSearch />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/terms" element={<Legal kind="terms" />} />
        <Route path="/privacy" element={<Legal kind="privacy" />} />
        <Route path="/refund" element={<Legal kind="refund" />} />
      </Route>

      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<Forgot />} />
      <Route path="/reset-password" element={<Reset />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Sites />} />
          <Route path="/dashboard/orders" element={<StoreOrders />} />
          <Route path="/dashboard/billing" element={<Billing />} />
          <Route path="/dashboard/domains" element={<Domains />} />
          <Route path="/dashboard/profile" element={<Profile />} />
        </Route>
        <Route path="/editor/:siteId" element={<Editor />} />
        <Route path="/checkout/:orderId" element={<Checkout />} />
        <Route path="/payment/result" element={<PaymentResult />} />
      </Route>

      <Route element={<ProtectedRoute adminOnly />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminHome />} />
          <Route path="/admin/customers" element={<AdminCustomers />} />
          <Route path="/admin/templates" element={<AdminTemplates />} />
          <Route path="/admin/plans" element={<AdminPlans />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/contacts" element={<AdminContacts />} />
          <Route path="/admin/audit" element={<AdminAudit />} />
        </Route>
      </Route>

      <Route path="/s/:subdomain" element={<PublicSite />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <BrandProvider>
        <AuthProvider>
          <AppRouter />
          <Toaster position="top-center" richColors closeButton />
        </AuthProvider>
      </BrandProvider>
    </BrowserRouter>
  );
}
