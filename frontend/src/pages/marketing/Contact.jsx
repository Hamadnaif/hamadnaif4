import { useState } from "react";
import { toast } from "sonner";
import { api, apiError } from "@/lib/api";
import { useBrand } from "@/context/BrandContext";
import { usePageMeta } from "@/lib/usePageMeta";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin, CheckCircle2 } from "lucide-react";

export default function Contact() {
  usePageMeta("تواصل معنا", "تواصل مع فريق منصتي لأي استفسار أو دعم — عبر النموذج أو البريد الإلكتروني أو الهاتف.");
  const { settings } = useBrand();
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await api.post("/public/contact", form);
      setDone(true);
      toast.success("تم إرسال رسالتك بنجاح");
    } catch (err) {
      toast.error(apiError(err.response?.data?.detail));
    }
    setSending(false);
  };

  const tel = (settings.contact_phone || "").replace(/[^\d+]/g, "");
  const inputCls = "rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[var(--brand-accent)] focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)]";

  return (
    <div className="max-w-5xl mx-auto px-6 py-16" data-testid="contact-page">
      <div className="text-center mb-10">
        <h1 className="font-head text-4xl sm:text-5xl font-extrabold brand-text mb-3">تواصل معنا</h1>
        <p className="text-slate-600">{settings.pages_content?.contact}</p>
      </div>
      <div className="grid md:grid-cols-3 gap-8">
        <div className="space-y-4">
          {settings.contact_email && (
            <a href={`mailto:${settings.contact_email}`} className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 hover:border-[var(--brand-accent)] transition-colors" data-testid="contact-email-link">
              <Mail className="w-5 h-5 brand-accent-text" /><span className="text-slate-700" dir="ltr">{settings.contact_email}</span>
            </a>
          )}
          {settings.contact_phone && (
            <a href={`tel:${tel}`} className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 hover:border-[var(--brand-accent)] transition-colors" data-testid="contact-phone-link">
              <Phone className="w-5 h-5 brand-accent-text" /><span className="text-slate-700" dir="ltr">{settings.contact_phone}</span>
            </a>
          )}
          <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-200"><MapPin className="w-5 h-5 brand-accent-text" /><span className="text-slate-700">المملكة العربية السعودية</span></div>
        </div>
        <div className="md:col-span-2">
          {done ? (
            <div className="h-full grid place-items-center p-10 rounded-2xl bg-green-50 border border-green-200 text-green-700 text-center" data-testid="contact-page-success">
              <div><CheckCircle2 className="w-12 h-12 mx-auto mb-3" /> شكرًا لتواصلك، سنرد عليك في أقرب وقت.</div>
            </div>
          ) : (
            <form onSubmit={submit} className="grid gap-4 bg-white p-6 rounded-2xl border border-slate-200 soft-shadow">
              <div>
                <label htmlFor="c-name" className="block text-sm font-semibold text-slate-600 mb-1">الاسم</label>
                <input id="c-name" required autoComplete="name" placeholder="اسمك الكامل" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={`w-full ${inputCls}`} data-testid="contact-page-name" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="c-email" className="block text-sm font-semibold text-slate-600 mb-1">البريد الإلكتروني</label>
                  <input id="c-email" required type="email" autoComplete="email" dir="ltr" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={`w-full ${inputCls}`} data-testid="contact-page-email" />
                </div>
                <div>
                  <label htmlFor="c-phone" className="block text-sm font-semibold text-slate-600 mb-1">رقم الجوال <span className="text-slate-400 font-normal">(اختياري)</span></label>
                  <input id="c-phone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" placeholder="+9665xxxxxxxx" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={`w-full ${inputCls}`} data-testid="contact-page-phone" />
                </div>
              </div>
              <div>
                <label htmlFor="c-message" className="block text-sm font-semibold text-slate-600 mb-1">رسالتك</label>
                <textarea id="c-message" required rows={5} placeholder="اكتب رسالتك هنا" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className={`w-full ${inputCls}`} data-testid="contact-page-message" />
              </div>
              <Button type="submit" disabled={sending} className="brand-bg text-white rounded-full py-6" data-testid="contact-page-submit">{sending ? "جارٍ الإرسال..." : "إرسال"}</Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
