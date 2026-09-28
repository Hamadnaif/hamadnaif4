import { useState } from "react";
import { mediaUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Sparkles, Star, ChevronDown, Mail, Phone, MapPin, Quote, CheckCircle2,
  ShoppingCart, Plus, Minus, X,
} from "lucide-react";

function SectionWrap({ children, className = "" }) {
  return <section className={`px-6 py-14 ${className}`}>{children}</section>;
}

function Hero({ d }) {
  const align = d.align === "start" ? "text-start items-start" : "text-center items-center";
  return (
    <section className="relative overflow-hidden">
      {d.image && (
        <img src={mediaUrl(d.image)} alt="" className="absolute inset-0 w-full h-full object-cover" />
      )}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, color-mix(in srgb, var(--brand-primary) 45%, transparent), color-mix(in srgb, var(--brand-primary) 88%, black 8%))" }} />
      <div className={`relative max-w-4xl mx-auto px-6 py-28 flex flex-col ${align} text-white`}>
        <h1 className="font-head text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-4">{d.title}</h1>
        {d.subtitle && <p className="text-lg sm:text-xl text-white/90 max-w-2xl mb-8">{d.subtitle}</p>}
        {d.button_text && (
          <a href={d.button_link || "#"} className="inline-flex items-center rounded-full px-8 py-3 font-bold shadow-lg hover:-translate-y-0.5 transition-transform" style={{ background: "var(--brand-secondary)", color: "color-mix(in srgb, var(--brand-primary) 88%, black)" }}>
            {d.button_text}
          </a>
        )}
      </div>
    </section>
  );
}

function TextSection({ d }) {
  const align = d.align === "center" ? "text-center mx-auto" : "text-start";
  return (
    <SectionWrap>
      <div className={`max-w-3xl ${align === "text-center mx-auto" ? "mx-auto text-center" : ""}`}>
        {d.title && <h2 className="font-head text-3xl font-extrabold brand-text mb-4">{d.title}</h2>}
        <p className="text-slate-700 text-lg leading-relaxed whitespace-pre-line">{d.body}</p>
      </div>
    </SectionWrap>
  );
}

function Services({ d }) {
  return (
    <SectionWrap className="bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          {d.subtitle && <span className="gold-text font-bold text-sm">{d.subtitle}</span>}
          <h2 className="font-head text-3xl font-extrabold brand-text mt-1">{d.title}</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {(d.items || []).map((it, i) => (
            <div key={i} className="p-7 rounded-2xl border border-slate-200 soft-shadow bg-[#FAFAFA] transition-transform duration-200 hover:-translate-y-1">
              <span className="w-12 h-12 rounded-xl brand-accent-bg text-white grid place-items-center mb-4"><Sparkles className="w-6 h-6" /></span>
              <h3 className="font-bold text-xl mb-2 brand-text">{it.title}</h3>
              <p className="text-slate-600 leading-relaxed">{it.description}</p>
            </div>
          ))}
        </div>
      </div>
    </SectionWrap>
  );
}

function Gallery({ d }) {
  return (
    <SectionWrap>
      <div className="max-w-6xl mx-auto">
        {d.title && <h2 className="font-head text-3xl font-extrabold brand-text mb-8 text-center">{d.title}</h2>}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
          {(d.images || []).map((img, i) => (
            <div key={i} className="aspect-square rounded-xl overflow-hidden soft-shadow">
              <img src={mediaUrl(img)} alt="" className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" />
            </div>
          ))}
        </div>
      </div>
    </SectionWrap>
  );
}

function ImageBlock({ d }) {
  return (
    <SectionWrap>
      <div className="max-w-4xl mx-auto">
        {d.image && <img src={mediaUrl(d.image)} alt={d.caption || ""} className="w-full rounded-2xl soft-shadow" />}
        {d.caption && <p className="text-center text-slate-500 mt-3">{d.caption}</p>}
      </div>
    </SectionWrap>
  );
}

function Testimonials({ d }) {
  return (
    <SectionWrap className="brand-bg text-white">
      <div className="max-w-6xl mx-auto">
        <h2 className="font-head text-3xl font-extrabold mb-10 text-center gold-text">{d.title}</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {(d.items || []).map((t, i) => (
            <div key={i} className="p-7 rounded-2xl bg-white/5 border border-white/10">
              <Quote className="w-8 h-8 gold-text mb-3" />
              <p className="text-white/90 text-lg leading-relaxed mb-4">{t.text}</p>
              <div className="flex items-center gap-1 mb-2">{[...Array(5)].map((_, s) => <Star key={s} className="w-4 h-4 fill-current gold-text" />)}</div>
              <div className="font-bold">{t.name}</div>
              <div className="text-white/60 text-sm">{t.role}</div>
            </div>
          ))}
        </div>
      </div>
    </SectionWrap>
  );
}

function Products({ d }) {
  return (
    <SectionWrap className="bg-white">
      <div className="max-w-6xl mx-auto">
        {d.title && <h2 className="font-head text-3xl font-extrabold brand-text mb-8 text-center">{d.title}</h2>}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {(d.items || []).map((p, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 overflow-hidden soft-shadow bg-white">
              {p.image && <div className="aspect-video overflow-hidden"><img src={mediaUrl(p.image)} alt={p.name} className="w-full h-full object-cover" /></div>}
              <div className="p-5">
                <h3 className="font-bold text-lg brand-text">{p.name}</h3>
                {p.description && <p className="text-slate-600 text-sm mt-1">{p.description}</p>}
                {p.price && <div className="mt-3 font-extrabold brand-accent-text">{p.price}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionWrap>
  );
}

function Faq({ d }) {
  const [open, setOpen] = useState(0);
  return (
    <SectionWrap>
      <div className="max-w-3xl mx-auto">
        <h2 className="font-head text-3xl font-extrabold brand-text mb-8 text-center">{d.title}</h2>
        <div className="space-y-3">
          {(d.items || []).map((f, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <button className="w-full flex items-center justify-between p-5 text-start font-bold brand-text" onClick={() => setOpen(open === i ? -1 : i)}>
                {f.q}
                <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${open === i ? "rotate-180" : ""}`} />
              </button>
              {open === i && <div className="px-5 pb-5 text-slate-600 leading-relaxed">{f.a}</div>}
            </div>
          ))}
        </div>
      </div>
    </SectionWrap>
  );
}

function Contact({ d, onContact, settings }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!onContact) return;
    setSending(true);
    const ok = await onContact(form);
    setSending(false);
    if (ok) { setDone(true); setForm({ name: "", email: "", phone: "", message: "" }); }
  };
  return (
    <SectionWrap className="bg-white" >
      <div className="max-w-3xl mx-auto" id="contact">
        <div className="text-center mb-8">
          <h2 className="font-head text-3xl font-extrabold brand-text">{d.title || "تواصل معنا"}</h2>
          {d.subtitle && <p className="text-slate-600 mt-2">{d.subtitle}</p>}
        </div>
        {done ? (
          <div className="text-center p-8 rounded-2xl bg-green-50 border border-green-200 text-green-700 flex flex-col items-center gap-2">
            <CheckCircle2 className="w-10 h-10" /> تم إرسال رسالتك بنجاح، شكرًا لتواصلك.
          </div>
        ) : (
          <form onSubmit={submit} className="grid gap-4">
            <input required placeholder="الاسم" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[var(--brand-accent)]" data-testid="contact-name" />
            <div className="grid sm:grid-cols-2 gap-4">
              <input required type="email" placeholder="البريد الإلكتروني" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[var(--brand-accent)]" data-testid="contact-email" />
              <input placeholder="رقم الجوال (اختياري)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[var(--brand-accent)]" data-testid="contact-phone" />
            </div>
            <textarea required placeholder="رسالتك" rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[var(--brand-accent)]" data-testid="contact-message" />
            <Button type="submit" disabled={sending} className="brand-bg text-white rounded-full py-6 text-base" data-testid="contact-submit">
              {sending ? "جارٍ الإرسال..." : "إرسال الرسالة"}
            </Button>
          </form>
        )}
        {(d.show_email || d.show_phone) && settings && (
          <div className="flex flex-wrap justify-center gap-6 mt-8 text-slate-600">
            {d.show_email && settings.contact_email && <span className="flex items-center gap-2"><Mail className="w-4 h-4" /> {settings.contact_email}</span>}
            {d.show_phone && settings.contact_phone && <span className="flex items-center gap-2"><Phone className="w-4 h-4" /> {settings.contact_phone}</span>}
          </div>
        )}
      </div>
    </SectionWrap>
  );
}

function MapBlock({ d }) {
  return (
    <SectionWrap>
      <div className="max-w-5xl mx-auto">
        {d.title && <h2 className="font-head text-2xl font-extrabold brand-text mb-4 text-center">{d.title}</h2>}
        <div className="rounded-2xl overflow-hidden soft-shadow h-80 bg-slate-100">
          <iframe title="map" className="w-full h-full border-0" src={`https://maps.google.com/maps?q=${encodeURIComponent(d.address || "Riyadh")}&output=embed`} />
        </div>
      </div>
    </SectionWrap>
  );
}

function TeamBlock({ d }) {
  return (
    <SectionWrap className="bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          {d.subtitle && <span className="gold-text font-bold text-sm">{d.subtitle}</span>}
          <h2 className="font-head text-3xl font-extrabold brand-text mt-1">{d.title}</h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
          {(d.members || []).map((m, i) => (
            <div key={i} className="text-center p-6 rounded-2xl bg-[#FAFAFA] border border-slate-200">
              <div className="w-24 h-24 rounded-full overflow-hidden mx-auto mb-4 bg-slate-200">
                {m.image ? <img src={mediaUrl(m.image)} alt={m.name} className="w-full h-full object-cover" /> : <span className="w-full h-full grid place-items-center brand-text font-bold text-2xl">{(m.name || "?").charAt(0)}</span>}
              </div>
              <h3 className="font-bold brand-text">{m.name}</h3>
              <p className="text-slate-500 text-sm">{m.role}</p>
            </div>
          ))}
        </div>
      </div>
    </SectionWrap>
  );
}

function PricingBlock({ d }) {
  return (
    <SectionWrap className="bg-[#FAFAFA]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          {d.subtitle && <span className="gold-text font-bold text-sm">{d.subtitle}</span>}
          <h2 className="font-head text-3xl font-extrabold brand-text mt-1">{d.title}</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {(d.plans || []).map((p, i) => (
            <div key={i} className={`rounded-2xl p-7 bg-white border ${p.highlight ? "border-[var(--brand-accent)] soft-shadow-lg" : "border-slate-200 soft-shadow"}`}>
              {p.highlight && <span className="inline-block mb-3 text-xs font-bold brand-accent-bg text-white rounded-full px-3 py-1">مميّزة</span>}
              <h3 className="font-head text-xl font-extrabold brand-text">{p.name}</h3>
              <div className="my-4"><span className="text-4xl font-extrabold brand-text">{p.price}</span><span className="text-slate-400 text-sm"> / {p.period}</span></div>
              <ul className="space-y-2">
                {(p.features || []).map((f, x) => <li key={x} className="flex items-center gap-2 text-slate-600 text-sm"><CheckCircle2 className="w-4 h-4 text-green-500" /> {f}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </SectionWrap>
  );
}

function CtaBlock({ d }) {
  return (
    <section className="px-6 py-16">
      <div className="max-w-5xl mx-auto rounded-3xl brand-bg text-white p-12 text-center relative overflow-hidden">
        <div className="absolute -bottom-20 -end-20 w-72 h-72 rounded-full" style={{ background: "radial-gradient(circle, rgba(212,175,55,0.3), transparent 70%)" }} />
        <h2 className="font-head text-3xl font-extrabold mb-3 relative">{d.title}</h2>
        {d.subtitle && <p className="text-white/80 mb-7 relative">{d.subtitle}</p>}
        {d.button_text && <a href={d.button_link || "#"} className="relative inline-flex rounded-full px-9 py-3 font-bold hover:-translate-y-0.5 transition-transform" style={{ background: "var(--brand-secondary)", color: "color-mix(in srgb, var(--brand-primary) 88%, black)" }}>{d.button_text}</a>}
      </div>
    </section>
  );
}

function FooterBlock({ d }) {
  return (
    <footer className="brand-bg text-white px-6 py-10 text-center">
      <p className="text-white/80">{d.text}</p>
      {(d.links || []).length > 0 && (
        <div className="flex justify-center gap-4 mt-3 text-sm">
          {d.links.map((l, i) => <a key={i} href={l.url} className="text-white/70 hover:text-white">{l.label}</a>)}
        </div>
      )}
    </footer>
  );
}

function LogosBlock({ d }) {
  return (
    <SectionWrap className="bg-white">
      <div className="max-w-6xl mx-auto text-center">
        {d.title && <h2 className="font-head text-2xl font-extrabold brand-text mb-8">{d.title}</h2>}
        <div className="flex flex-wrap items-center justify-center gap-8">
          {(d.logos || []).length === 0 ? (
            <p className="text-slate-400 text-sm">أضف شعارات عملائك من لوحة التحرير</p>
          ) : d.logos.map((lg, i) => (
            <img key={i} src={mediaUrl(lg)} alt="" className="h-12 w-auto object-contain opacity-70 hover:opacity-100 transition-opacity grayscale hover:grayscale-0" />
          ))}
        </div>
      </div>
    </SectionWrap>
  );
}

function StoreBlock({ d, onOrder }) {
  const products = d.products || [];
  const currency = d.currency || "SAR";
  const [cart, setCart] = useState({});
  const [checkout, setCheckout] = useState(false);
  const [form, setForm] = useState({ customer_name: "", phone: "", address: "", note: "" });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const add = (i) => setCart((c) => ({ ...c, [i]: (c[i] || 0) + 1 }));
  const sub = (i) => setCart((c) => { const n = { ...c }; n[i] = (n[i] || 0) - 1; if (n[i] <= 0) delete n[i]; return n; });
  const items = Object.entries(cart).map(([i, qty]) => ({ ...products[i], qty }));
  const total = items.reduce((s, it) => s + (parseFloat(it.price) || 0) * it.qty, 0);
  const count = items.reduce((s, it) => s + it.qty, 0);

  const submit = async (e) => {
    e.preventDefault();
    if (!onOrder) return;
    setSending(true);
    const ok = await onOrder({
      customer_name: form.customer_name, phone: form.phone, address: form.address, note: form.note,
      items: items.map((it) => ({ name: it.name, price: parseFloat(it.price) || 0, qty: it.qty })),
      total, currency,
    });
    setSending(false);
    if (ok) { setDone(true); setCart({}); setCheckout(false); }
  };

  return (
    <SectionWrap className="bg-[#FAFAFA]">
      <div className="max-w-6xl mx-auto">
        {d.title && <h2 className="font-head text-3xl font-extrabold brand-text mb-8 text-center">{d.title}</h2>}
        {done && <div className="mb-6 text-center p-4 rounded-xl bg-green-50 border border-green-200 text-green-700">تم استلام طلبك بنجاح، سنتواصل معك لتأكيده.</div>}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p, i) => (
            <div key={i} className="rounded-2xl bg-white border border-slate-200 overflow-hidden soft-shadow flex flex-col">
              {p.image && <div className="aspect-video overflow-hidden"><img src={mediaUrl(p.image)} alt={p.name} className="w-full h-full object-cover" /></div>}
              <div className="p-4 flex flex-col flex-1">
                <h3 className="font-bold brand-text">{p.name}</h3>
                {p.description && <p className="text-slate-500 text-sm mt-1 flex-1">{p.description}</p>}
                <div className="flex items-center justify-between mt-3">
                  <span className="font-extrabold brand-text">{p.price} {currency}</span>
                  {cart[i] ? (
                    <div className="flex items-center gap-2">
                      <button onClick={() => sub(i)} className="w-7 h-7 rounded-full bg-slate-100 grid place-items-center"><Minus className="w-4 h-4" /></button>
                      <span className="font-bold w-5 text-center">{cart[i]}</span>
                      <button onClick={() => add(i)} className="w-7 h-7 rounded-full brand-accent-bg text-white grid place-items-center"><Plus className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <button onClick={() => add(i)} className="rounded-full brand-bg text-white px-4 py-1.5 text-sm font-semibold flex items-center gap-1"><ShoppingCart className="w-4 h-4" /> أضف</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {count > 0 && !checkout && (
          <div className="sticky bottom-4 mt-8 mx-auto max-w-md bg-white rounded-2xl border border-slate-200 soft-shadow-lg p-4 flex items-center justify-between">
            <div><span className="font-bold brand-text">{count} منتج</span><span className="text-slate-400 text-sm"> · الإجمالي {total.toFixed(2)} {currency}</span></div>
            <Button onClick={() => setCheckout(true)} className="brand-accent-bg text-white rounded-full" data-testid="store-checkout-btn">إتمام الطلب</Button>
          </div>
        )}

        {checkout && (
          <form onSubmit={submit} className="mt-8 mx-auto max-w-md bg-white rounded-2xl border border-slate-200 soft-shadow p-6 space-y-3">
            <div className="flex items-center justify-between"><h3 className="font-bold brand-text">إتمام الطلب</h3><button type="button" onClick={() => setCheckout(false)}><X className="w-5 h-5 text-slate-400" /></button></div>
            <div className="space-y-1 text-sm text-slate-600 pb-2 border-b border-slate-100">
              {items.map((it, x) => <div key={x} className="flex justify-between"><span>{it.name} ×{it.qty}</span><span>{((parseFloat(it.price) || 0) * it.qty).toFixed(2)}</span></div>)}
              <div className="flex justify-between font-bold brand-text pt-1"><span>الإجمالي</span><span>{total.toFixed(2)} {currency}</span></div>
            </div>
            <input required placeholder="الاسم" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:border-[var(--brand-accent)]" data-testid="store-name" />
            <input required placeholder="رقم الجوال" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:border-[var(--brand-accent)]" data-testid="store-phone" />
            <input placeholder="عنوان التوصيل" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:border-[var(--brand-accent)]" data-testid="store-address" />
            <textarea placeholder="ملاحظات (اختياري)" rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:border-[var(--brand-accent)]" />
            <p className="text-xs text-amber-600">الدفع عند الاستلام أو التحويل — الدفع الإلكتروني يُفعّل بعد ربط بوابة الدفع.</p>
            <Button type="submit" disabled={sending || !onOrder} className="w-full brand-bg text-white rounded-full py-5" data-testid="store-submit-order">{sending ? "جارٍ الإرسال..." : "تأكيد الطلب"}</Button>
          </form>
        )}
      </div>
    </SectionWrap>
  );
}

export default function SectionRenderer({ section, onContact, onOrder, settings }) {
  const d = section.data || {};
  switch (section.type) {
    case "hero": return <Hero d={d} />;
    case "text": return <TextSection d={d} />;
    case "services": return <Services d={d} />;
    case "gallery": return <Gallery d={d} />;
    case "image": return <ImageBlock d={d} />;
    case "products": return <Products d={d} />;
    case "store": return <StoreBlock d={d} onOrder={onOrder} />;
    case "logos": return <LogosBlock d={d} />;
    case "testimonials": return <Testimonials d={d} />;
    case "team": return <TeamBlock d={d} />;
    case "pricing": return <PricingBlock d={d} />;
    case "cta": return <CtaBlock d={d} />;
    case "faq": return <Faq d={d} />;
    case "contact": return <Contact d={d} onContact={onContact} settings={settings} />;
    case "map": return <MapBlock d={d} />;
    case "footer": return <FooterBlock d={d} />;
    default: return null;
  }
}
