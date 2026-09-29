import { useEffect, useState } from "react";
import { api, apiError } from "@/lib/api";
import { Button } from "@/components/ui/button";

const labels = { active: "مفعّل", pending: "بانتظار استكمال البيانات وموافقة Tap", creating: "جارٍ التحقق من طلب التفعيل", verification_required: "الطلب يحتاج مراجعة الدعم", not_started: "لم يبدأ التفعيل" };
export default function MerchantPayments() {
  const [account, setAccount] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ brand_name: "", first_name: "", last_name: "", phone: "", identification_type: "national_id", identification_number: "", nationality: "SA", consent: false });
  const load = async () => { try { setError(""); setAccount((await api.get("/commerce/account")).data); } catch (e) { setError(apiError(e.response?.data?.detail)); } };
  useEffect(() => { load(); }, []);
  const start = async (e) => {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const { data } = await api.post(account?.tap_lead_id ? "/commerce/connect/resume" : "/commerce/connect", account?.tap_lead_id ? {} : form);
      setForm((f) => ({ ...f, identification_number: "" }));
      setAccount(data);
      if (data.connect_url) window.location.assign(data.connect_url);
    } catch (err) { setError(apiError(err.response?.data?.detail)); }
    finally { setBusy(false); }
  };
  return <div className="space-y-6 max-w-2xl" data-testid="merchant-payments-page">
    <div><h2 className="text-2xl font-extrabold brand-text">مدفوعات متجرك</h2><p className="text-slate-500 mt-2">فعّل حساب التاجر لاستقبال مدفوعات عملائك عبر صفحة Tap الآمنة.</p></div>
    {error && <p role="alert" className="p-4 rounded-xl bg-red-50 text-red-700">{error}</p>}
    {!account ? <Button onClick={load}>إعادة تحميل الحالة</Button> : <>
      <div className="bg-white border rounded-2xl p-6 space-y-3"><p>الحالة: <strong>{labels[account.status] || "لم يبدأ التفعيل"}</strong></p>
        <p className="text-sm text-amber-800">وضع اختبار فقط — لا تُحصّل أموال حقيقية. لا يتم تفعيل الدفع قبل موافقة Tap على استقبال المدفوعات.</p>
        {!account.configured && <p className="text-slate-500">الخدمة قيد التجهيز من إدارة المنصة. يمكنك مواصلة إنشاء موقعك.</p>}
        <Button variant="outline" onClick={load}>تحديث الحالة</Button>
      </div>
      {account.configured && <form onSubmit={start} className="bg-white border rounded-2xl p-6 space-y-4">
        {!account.tap_lead_id && <>
          {[['brand_name','اسم النشاط'],['first_name','الاسم الأول'],['last_name','اسم العائلة'],['phone','الجوال بدون 0 أو 966'],['identification_number','رقم الهوية أو الإقامة'],['nationality','رمز الجنسية (مثال SA)']].map(([key,label]) => <label key={key} className="block text-sm font-semibold">{label}<input required value={form[key]} autoComplete="off" maxLength={key === 'identification_number' ? 10 : key === 'nationality' ? 2 : 100} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="mt-1 w-full rounded-xl border px-4 py-3" /></label>)}
          <label className="block text-sm">نوع الوثيقة<select className="mt-1 w-full border rounded-xl p-3" value={form.identification_type} onChange={(e) => setForm({...form, identification_type: e.target.value})}><option value="national_id">هوية وطنية</option><option value="iqamah">إقامة</option></select></label>
          <label className="flex gap-3 text-sm"><input type="checkbox" required checked={form.consent} onChange={(e) => setForm({...form, consent: e.target.checked})} />أوافق على إرسال هذه البيانات إلى Tap لفتح حساب التاجر. تُستكمل الوثائق وبيانات البنك على صفحة Tap.</label>
        </>}
        <Button disabled={busy || (!account.tap_lead_id && ['creating','verification_required'].includes(account.status))} type="submit" className="brand-bg text-white">{busy ? "جارٍ التجهيز…" : account.tap_lead_id ? "متابعة بيانات التاجر لدى Tap" : "بدء التفعيل"}</Button>
      </form>}
    </>}
  </div>;
}
