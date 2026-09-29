import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Loader2, ShoppingBag, Phone, MapPin } from "lucide-react";

export default function StoreOrders() {
  const [rows, setRows] = useState(null);
  useEffect(() => { api.get("/account/store-orders").then((r) => setRows(r.data)).catch(() => setRows([])); }, []);
  if (!rows) return <div className="grid place-items-center py-20"><Loader2 className="w-8 h-8 animate-spin brand-accent-text" /></div>;
  return (
    <div data-testid="store-orders-page">
      <h2 className="font-head text-xl font-extrabold brand-text mb-6">طلبات المتجر ({rows.length})</h2>
      {rows.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300 text-slate-400"><ShoppingBag className="w-10 h-10 mx-auto mb-2" /> لا توجد طلبات بعد. انشر موقعًا يحتوي على قسم متجر لتصلك الطلبات هنا.</div>
      ) : (
        <div className="space-y-3">
          {rows.map((o) => (
            <div key={o.id} className="bg-white rounded-2xl border border-slate-200 soft-shadow p-5" data-testid={`store-order-${o.id}`}>
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold brand-text">{o.customer_name}</span>
                  <span className="text-xs bg-slate-100 rounded-full px-2 py-0.5 text-slate-500">{o.site_name}</span>
                  <span className="text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">{o.status === "new" ? "جديد" : o.status}</span>
                </div>
                <span className="text-xs text-slate-400">{new Date(o.created_at).toLocaleString("ar-SA")}</span>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-slate-500 mb-3">
                <span className="flex items-center gap-1" dir="ltr"><Phone className="w-3.5 h-3.5" /> {o.phone}</span>
                {o.address && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {o.address}</span>}
              </div>
              <div className="bg-slate-50 rounded-xl p-3 space-y-1 text-sm">
                {(o.items || []).map((it, x) => <div key={x} className="flex justify-between"><span>{it.name} ×{it.qty}</span><span>{(it.price * it.qty).toFixed(2)}</span></div>)}
                <div className="flex justify-between font-bold brand-text pt-1 border-t border-slate-200"><span>الإجمالي</span><span>{o.total} {o.currency}</span></div>
              </div>
              <p className="text-sm mt-3">الدفع: {{paid:"مدفوع", pending:"بانتظار الدفع", failed:"فشل الدفع", unpaid:"غير مدفوع"}[o.payment_status] || "غير مدفوع"}{o.mode === "test" && " — تجريبي"}</p>
              {o.note && <p className="text-slate-500 text-sm mt-2">ملاحظة: {o.note}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
