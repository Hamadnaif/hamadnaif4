import { useState } from "react";
import { toast } from "sonner";
import { api, apiError } from "@/lib/api";
import { useBrand } from "@/context/BrandContext";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin, CheckCircle2 } from "lucide-react";

export default function Contact() {
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

  return (
    <div className="max-w-5xl mx-auto px-6 py-16" data-testid="contact-page">
      <div className="text-center mb-10">
        <h1 className="font-head text-4xl sm:text-5xl font-extrabold brand-text mb-3">تواصل معنا</h1>
        <p className="text-slate-600">{settings.pages_content?.contact}</p>
      </div>
      <div className="grid md:grid-cols-3 gap-8">
        <div className="space-y-4">
          {settings.contact_email && <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-200"><Mail className="w-5 h-5 brand-accent-text" /><span className="text-slate-700">{settings.contact_email}</span></div>}
          {settings.contact_phone && <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-200"><Phone className="w-5 h-5 brand-accent-text" /><span className="text-slate-700" dir="ltr">{settings.contact_phone}</span></div>}
          <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-200"><MapPin className="w-5 h-5 brand-accent-text" /><span className="text-slate-700">المملكة العربية السعودية</span></div>
        </div>
        <div className="md:col-span-2">
          {done ? (
            <div className="h-full grid place-items-center p-10 rounded-2xl bg-green-50 border border-green-200 text-green-700 text-center">
              <div><CheckCircle2 className="w-12 h-12 mx-auto mb-3" /> شكرًا لتواصلك، سنرد عليك في أقرب وقت.</div>
            </div>
          ) : (
            <form onSubmit={submit} className="grid gap-4 bg-white p-6 rounded-2xl border border-slate-200 soft-shadow">
              <input required placeholder="الاسم" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[var(--brand-accent)]" data-testid="contact-page-name" />
              <div className="grid sm:grid-cols-2 gap-4">
                <input required type="email" placeholder="البريد الإلكتروني" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[var(--brand-accent)]" data-testid="contact-page-email" />
                <input placeholder="رقم الجوال" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[var(--brand-accent)]" data-testid="contact-page-phone" />
              </div>
              <textarea required rows={5} placeholder="رسالتك" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[var(--brand-accent)]" data-testid="contact-page-message" />
              <Button type="submit" disabled={sending} className="brand-bg text-white rounded-full py-6" data-testid="contact-page-submit">{sending ? "جارٍ الإرسال..." : "إرسال"}</Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
