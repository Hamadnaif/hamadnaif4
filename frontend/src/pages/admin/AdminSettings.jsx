import { useEffect, useState } from "react";
import { api, apiError } from "@/lib/api";
import { useBrand } from "@/context/BrandContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Save } from "lucide-react";

const inputCls = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--brand-accent)]";
const Field = ({ label, children }) => <div className="mb-3"><label className="text-xs font-bold text-slate-500 mb-1 block">{label}</label>{children}</div>;

export default function AdminSettings() {
  const { reloadBrand } = useBrand();
  const [s, setS] = useState(null);

  useEffect(() => { api.get("/admin/settings").then((r) => setS(r.data)).catch(() => setS({})); }, []);

  const set = (key, val) => setS((p) => ({ ...p, [key]: val }));
  const setColor = (key, val) => setS((p) => ({ ...p, colors: { ...(p.colors || {}), [key]: val } }));
  const setPage = (key, val) => setS((p) => ({ ...p, pages_content: { ...(p.pages_content || {}), [key]: val } }));
  const setIntg = (key, val) => setS((p) => ({ ...p, integrations: { ...(p.integrations || {}), [key]: val } }));

  const save = async () => {
    try {
      await api.put("/admin/settings", s);
      toast.success("تم حفظ الإعدادات");
      reloadBrand();
    } catch (err) { toast.error(apiError(err.response?.data?.detail)); }
  };

  if (!s) return <div className="grid place-items-center py-20"><Loader2 className="w-8 h-8 animate-spin brand-accent-text" /></div>;

  return (
    <div data-testid="admin-settings">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-head text-2xl font-extrabold brand-text">إعدادات المنصة</h1>
        <Button onClick={save} className="brand-bg text-white rounded-full" data-testid="settings-save"><Save className="w-4 h-4 ms-1" /> حفظ الكل</Button>
      </div>
      <Tabs defaultValue="identity">
        <TabsList className="mb-4 flex-wrap h-auto">
          <TabsTrigger value="identity">الهوية</TabsTrigger>
          <TabsTrigger value="contact">التواصل</TabsTrigger>
          <TabsTrigger value="content">نصوص الصفحات</TabsTrigger>
          <TabsTrigger value="integrations">التكاملات</TabsTrigger>
        </TabsList>

        <TabsContent value="identity">
          <div className="bg-white rounded-2xl border border-slate-200 soft-shadow p-6 max-w-xl">
            <Field label="اسم المنصة"><input value={s.platform_name || ""} onChange={(e) => set("platform_name", e.target.value)} className={inputCls} data-testid="settings-platform-name" /></Field>
            <Field label="رابط الشعار"><input value={s.logo_url || ""} onChange={(e) => set("logo_url", e.target.value)} className={inputCls} dir="ltr" data-testid="settings-logo-url" /></Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="أساسي"><input type="color" value={s.colors?.primary || "#071D32"} onChange={(e) => setColor("primary", e.target.value)} className="w-full h-10 rounded-lg border" data-testid="settings-color-primary" /></Field>
              <Field label="ثانوي"><input type="color" value={s.colors?.secondary || "#2563EB"} onChange={(e) => setColor("secondary", e.target.value)} className="w-full h-10 rounded-lg border" data-testid="settings-color-secondary" /></Field>
              <Field label="تمييز"><input type="color" value={s.colors?.accent || "#2563EB"} onChange={(e) => setColor("accent", e.target.value)} className="w-full h-10 rounded-lg border" data-testid="settings-color-accent" /></Field>
            </div>
            <Field label="نطاق المنصة"><input value={s.platform_domain || ""} onChange={(e) => set("platform_domain", e.target.value)} className={inputCls} dir="ltr" /></Field>
          </div>
        </TabsContent>

        <TabsContent value="contact">
          <div className="bg-white rounded-2xl border border-slate-200 soft-shadow p-6 max-w-xl">
            <Field label="بريد التواصل"><input value={s.contact_email || ""} onChange={(e) => set("contact_email", e.target.value)} className={inputCls} dir="ltr" /></Field>
            <Field label="رقم الجوال"><input value={s.contact_phone || ""} onChange={(e) => set("contact_phone", e.target.value)} className={inputCls} dir="ltr" /></Field>
          </div>
        </TabsContent>

        <TabsContent value="content">
          <div className="bg-white rounded-2xl border border-slate-200 soft-shadow p-6 space-y-3">
            {[["about", "من نحن"], ["terms", "الشروط والأحكام"], ["privacy", "سياسة الخصوصية"], ["refund", "سياسة الاسترجاع"], ["contact", "نص صفحة التواصل"]].map(([k, label]) => (
              <Field key={k} label={label}><textarea value={s.pages_content?.[k] || ""} onChange={(e) => setPage(k, e.target.value)} className={inputCls} rows={3} data-testid={`settings-content-${k}`} /></Field>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="integrations">
          <div className="bg-white rounded-2xl border border-slate-200 soft-shadow p-6 max-w-xl space-y-3">
            <label className="flex items-center justify-between"><span>تفعيل بوابة الدفع Moyasar</span><input type="checkbox" checked={!!s.integrations?.moyasar_enabled} onChange={(e) => setIntg("moyasar_enabled", e.target.checked)} data-testid="settings-moyasar" /></label>
            <label className="flex items-center justify-between"><span>تفعيل مزوّد النطاقات</span><input type="checkbox" checked={!!s.integrations?.domain_reseller_enabled} onChange={(e) => setIntg("domain_reseller_enabled", e.target.checked)} /></label>
            <Field label="مزوّد النطاقات"><input value={s.integrations?.domain_reseller_provider || ""} onChange={(e) => setIntg("domain_reseller_provider", e.target.value)} className={inputCls} /></Field>
            <p className="text-xs text-slate-400">ملاحظة: تفعيل التكامل هنا لا يفعّل الخدمة فعليًا حتى تُضاف المفاتيح السرية في متغيرات البيئة الآمنة على الخادم.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
