import { useState } from "react";
import { mediaUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Sparkles, Star, ChevronDown, Mail, Phone, MapPin, Quote, CheckCircle2,
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
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(10,37,64,0.55), rgba(10,37,64,0.8))" }} />
      <div className={`relative max-w-4xl mx-auto px-6 py-28 flex flex-col ${align} text-white`}>
        <h1 className="font-head text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-4">{d.title}</h1>
        {d.subtitle && <p className="text-lg sm:text-xl text-white/90 max-w-2xl mb-8">{d.subtitle}</p>}
        {d.button_text && (
          <a href={d.button_link || "#"} className="inline-flex items-center rounded-full px-8 py-3 font-bold text-[#0A2540]" style={{ background: "var(--brand-secondary)" }}>
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
    <SectionWrap className="bg-[#0A2540] text-white">
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

export default function SectionRenderer({ section, onContact, settings }) {
  const d = section.data || {};
  switch (section.type) {
    case "hero": return <Hero d={d} />;
    case "text": return <TextSection d={d} />;
    case "services": return <Services d={d} />;
    case "gallery": return <Gallery d={d} />;
    case "image": return <ImageBlock d={d} />;
    case "products": return <Products d={d} />;
    case "testimonials": return <Testimonials d={d} />;
    case "faq": return <Faq d={d} />;
    case "contact": return <Contact d={d} onContact={onContact} settings={settings} />;
    case "map": return <MapBlock d={d} />;
    case "footer": return <FooterBlock d={d} />;
    default: return null;
  }
}
