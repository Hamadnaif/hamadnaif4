import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { useBrand } from "@/context/BrandContext";
import { Button } from "@/components/ui/button";
import SectionRenderer from "@/components/SectionRenderer";
import TemplateTheme from "@/components/TemplateTheme";
import { Eye, ArrowLeft, Monitor, Smartphone, X, Sparkles } from "lucide-react";

function LivePreview({ template, onClose }) {
  const { settings } = useBrand();
  const [device, setDevice] = useState("desktop");
  const page = template?.config?.pages?.[0];
  const sections = page?.sections || [];
  const colors = template?.config?.brand?.colors;
  const font = template?.config?.brand?.font;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] bg-black/75 backdrop-blur-sm flex flex-col"
      data-testid="template-preview-overlay"
    >
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-white border-b border-slate-200">
        <div className="min-w-0">
          <div className="text-xs gold-text font-bold">{template.category}</div>
          <h3 className="font-head font-extrabold brand-text truncate text-lg">{template.name}</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center bg-slate-100 rounded-full p-1">
            <button onClick={() => setDevice("desktop")} data-testid="preview-device-desktop"
              className={`w-9 h-8 grid place-items-center rounded-full transition-colors ${device === "desktop" ? "bg-white shadow-sm brand-text" : "text-slate-400"}`}>
              <Monitor className="w-4 h-4" />
            </button>
            <button onClick={() => setDevice("mobile")} data-testid="preview-device-mobile"
              className={`w-9 h-8 grid place-items-center rounded-full transition-colors ${device === "mobile" ? "bg-white shadow-sm brand-text" : "text-slate-400"}`}>
              <Smartphone className="w-4 h-4" />
            </button>
          </div>
          <Link to="/register">
            <Button className="brand-bg text-white rounded-full" data-testid="preview-use-btn">
              استخدم هذا القالب <ArrowLeft className="w-4 h-4 ms-1" />
            </Button>
          </Link>
          <button onClick={onClose} data-testid="preview-close-btn" className="w-9 h-9 grid place-items-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors">
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-3 sm:p-6 grid place-items-start justify-center">
        <motion.div
          layout transition={{ type: "spring", stiffness: 260, damping: 30 }}
          className="bg-white rounded-2xl overflow-hidden soft-shadow-lg h-full w-full"
          style={{ maxWidth: device === "mobile" ? 400 : 1180 }}
        >
          <div className="flex items-center gap-1.5 px-4 h-9 bg-slate-100 border-b border-slate-200">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
            <span className="mx-auto text-[11px] text-slate-400" dir="ltr">manasati.sa/{template.name}</span>
          </div>
          <div className="overflow-y-auto no-scrollbar h-[calc(100%-2.25rem)]" data-testid="preview-canvas">
            <TemplateTheme colors={colors} font={font}>
              {sections.map((s) => (
                <SectionRenderer key={s.id} section={s} settings={settings} onContact={() => false} onOrder={() => false} />
              ))}
            </TemplateTheme>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [cat, setCat] = useState("all");
  const [preview, setPreview] = useState(null);

  useEffect(() => { api.get("/public/templates").then((r) => setTemplates(r.data)).catch(() => {}); }, []);

  const cats = useMemo(() => ["all", ...Array.from(new Set(templates.map((t) => t.category)))], [templates]);
  const filtered = cat === "all" ? templates : templates.filter((t) => t.category === cat);

  return (
    <div data-testid="templates-page">
      {/* header band */}
      <section className="brand-gradient text-white relative overflow-hidden">
        <div className="orb w-96 h-96 -top-24 -start-24" style={{ background: "var(--brand-secondary)", opacity: 0.35 }} />
        <div className="absolute inset-0 dotted-grid opacity-40" />
        <div className="relative max-w-7xl mx-auto px-6 py-20 text-center">
          <span className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-4 py-1.5 text-sm mb-5">
            <Sparkles className="w-4 h-4 gold-text" /> {templates.length}+ قالب احترافي جاهز
          </span>
          <h1 className="font-head text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-4">قوالب تبدأ منها، لا من الصفر</h1>
          <p className="text-white/80 max-w-2xl mx-auto text-lg">عايِن القالب حيًّا بكامل أقسامه وألوانه قبل أن تختاره، ثم ابدأ التحرير مباشرة من لوحة التحكم.</p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-14">
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {cats.map((c) => (
            <button key={c} onClick={() => setCat(c)} data-testid={`tpl-cat-${c}`}
              className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${cat === c ? "brand-bg text-white shadow-md" : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:-translate-y-0.5"}`}>
              {c === "all" ? "الكل" : c}
            </button>
          ))}
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.45, delay: (i % 6) * 0.05 }}
              className="group rounded-2xl overflow-hidden border border-slate-200 bg-white hover-lift"
              data-testid={`template-card-${t.id}`}
            >
              <div className="aspect-[4/3] overflow-hidden bg-slate-100 relative">
                <img src={t.thumbnail} alt={t.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-5">
                  <button onClick={() => setPreview(t)} data-testid={`template-preview-${t.id}`}
                    className="inline-flex items-center gap-2 bg-white text-slate-900 rounded-full px-5 py-2.5 font-bold text-sm shadow-lg hover:scale-105 transition-transform">
                    <Eye className="w-4 h-4" /> معاينة حيّة
                  </button>
                </div>
              </div>
              <div className="p-5">
                <span className="text-xs gold-text font-bold">{t.category}</span>
                <h3 className="font-bold text-lg brand-text mt-1">{t.name}</h3>
                <p className="text-slate-500 text-sm mt-1 mb-4 line-clamp-2">{t.description}</p>
                <div className="flex gap-2">
                  <button onClick={() => setPreview(t)} className="flex-1 rounded-full border border-slate-200 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors" data-testid={`template-preview-btn-${t.id}`}>معاينة</button>
                  <Link to="/register" className="flex-1"><Button className="w-full brand-bg text-white rounded-full">استخدم</Button></Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {preview && <LivePreview template={preview} onClose={() => setPreview(null)} />}
      </AnimatePresence>
    </div>
  );
}
