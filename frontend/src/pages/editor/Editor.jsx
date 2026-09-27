import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, apiError, mediaUrl } from "@/lib/api";
import { toast } from "sonner";
import SectionRenderer from "@/components/SectionRenderer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowRight, Save, Rocket, Monitor, Smartphone, Plus, Trash2, ChevronUp, ChevronDown,
  Loader2, Image as ImageIcon, Sparkles, Palette, FileText, Layers, Eye, Home, Star,
} from "lucide-react";

const SECTION_TYPES = [
  { type: "hero", label: "صورة رئيسية", icon: ImageIcon },
  { type: "text", label: "نص", icon: FileText },
  { type: "services", label: "خدمات", icon: Layers },
  { type: "gallery", label: "معرض صور", icon: ImageIcon },
  { type: "image", label: "صورة", icon: ImageIcon },
  { type: "products", label: "منتجات للعرض", icon: Layers },
  { type: "testimonials", label: "آراء العملاء", icon: Star },
  { type: "faq", label: "أسئلة شائعة", icon: FileText },
  { type: "contact", label: "نموذج تواصل", icon: FileText },
  { type: "map", label: "خريطة", icon: ImageIcon },
  { type: "footer", label: "تذييل", icon: Layers },
];

function defaultSection(type) {
  const id = `sec_${type}_${Math.random().toString(36).slice(2, 7)}`;
  const base = { id, type };
  const D = {
    hero: { title: "عنوان رئيسي", subtitle: "نص وصفي قصير يشرح ما تقدّمه.", image: "", button_text: "تواصل معنا", button_link: "#contact", align: "center" },
    text: { title: "عنوان القسم", body: "اكتب النص هنا...", align: "start" },
    services: { title: "خدماتنا", subtitle: "ما نقدّمه", items: [{ title: "خدمة", description: "وصف الخدمة" }] },
    gallery: { title: "معرض الأعمال", images: [] },
    image: { image: "", caption: "" },
    products: { title: "منتجاتنا", items: [{ name: "منتج", description: "وصف", price: "", image: "" }] },
    testimonials: { title: "آراء العملاء", items: [{ name: "عميل", role: "", text: "رأي العميل" }] },
    faq: { title: "أسئلة شائعة", items: [{ q: "سؤال؟", a: "إجابة." }] },
    contact: { title: "تواصل معنا", subtitle: "سنسعد بالرد عليك", show_phone: true, show_email: true },
    map: { title: "موقعنا", address: "Riyadh" },
    footer: { text: "© جميع الحقوق محفوظة", links: [] },
  };
  return { ...base, data: D[type] || {} };
}

function ImageUpload({ value, onChange, testid }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef();
  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const { data } = await api.post("/media", fd, { headers: { "Content-Type": "multipart/form-data" } });
      onChange(data.url);
      toast.success("تم رفع الصورة");
    } catch (err) { toast.error(apiError(err.response?.data?.detail)); }
    setUploading(false);
  };
  return (
    <div className="flex items-center gap-2">
      {value && <img src={mediaUrl(value)} alt="" className="w-12 h-12 rounded-lg object-cover border" />}
      <input ref={inputRef} type="file" accept="image/*" onChange={upload} className="hidden" data-testid={testid} />
      <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading} className="rounded-lg">
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ImageIcon className="w-4 h-4 ms-1" /> {value ? "تغيير" : "رفع صورة"}</>}
      </Button>
      {value && <button type="button" onClick={() => onChange("")} className="text-red-500 text-xs">إزالة</button>}
    </div>
  );
}

function Field({ label, children }) {
  return <div className="mb-3"><label className="text-xs font-bold text-slate-500 mb-1 block">{label}</label>{children}</div>;
}
const inputCls = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--brand-accent)]";

function ListEditor({ items, onChange, fields, addLabel, siteName }) {
  const update = (i, key, val) => { const c = [...items]; c[i] = { ...c[i], [key]: val }; onChange(c); };
  const add = () => onChange([...items, fields.reduce((a, f) => ({ ...a, [f.key]: "" }), {})]);
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <div className="flex justify-between mb-2"><span className="text-xs font-bold text-slate-400">#{i + 1}</span><button onClick={() => remove(i)} className="text-red-500"><Trash2 className="w-4 h-4" /></button></div>
          {fields.map((f) => (
            <div key={f.key} className="mb-2">
              {f.type === "image" ? <ImageUpload value={it[f.key]} onChange={(v) => update(i, f.key, v)} />
                : f.type === "textarea" ? <textarea placeholder={f.label} value={it[f.key] || ""} onChange={(e) => update(i, f.key, e.target.value)} className={inputCls} rows={2} />
                : <input placeholder={f.label} value={it[f.key] || ""} onChange={(e) => update(i, f.key, e.target.value)} className={inputCls} />}
            </div>
          ))}
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add} className="w-full rounded-lg"><Plus className="w-4 h-4 ms-1" /> {addLabel}</Button>
    </div>
  );
}

function SectionProperties({ section, onChange, siteName }) {
  const [genLoading, setGenLoading] = useState(false);
  const d = section.data || {};
  const set = (key, val) => onChange({ ...section, data: { ...d, [key]: val } });

  const generate = async (kind, targetKey) => {
    setGenLoading(true);
    try {
      const { data } = await api.post("/ai/generate", { kind, context: siteName, provider: "openai" });
      set(targetKey, data.text);
      toast.success("تم توليد المحتوى");
    } catch (err) { toast.error(apiError(err.response?.data?.detail)); }
    setGenLoading(false);
  };

  const AiBtn = ({ kind, targetKey }) => (
    <button type="button" onClick={() => generate(kind, targetKey)} disabled={genLoading} className="inline-flex items-center gap-1 text-xs brand-accent-text font-bold mb-1" data-testid="ai-generate-btn">
      {genLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} توليد بالذكاء
    </button>
  );

  switch (section.type) {
    case "hero":
      return (<>
        <Field label="العنوان"><input value={d.title || ""} onChange={(e) => set("title", e.target.value)} className={inputCls} data-testid="prop-hero-title" /></Field>
        <Field label={<>الوصف <AiBtn kind="hero" targetKey="subtitle" /></>}><textarea value={d.subtitle || ""} onChange={(e) => set("subtitle", e.target.value)} className={inputCls} rows={3} /></Field>
        <Field label="نص الزر"><input value={d.button_text || ""} onChange={(e) => set("button_text", e.target.value)} className={inputCls} /></Field>
        <Field label="رابط الزر"><input value={d.button_link || ""} onChange={(e) => set("button_link", e.target.value)} className={inputCls} dir="ltr" /></Field>
        <Field label="صورة الخلفية"><ImageUpload value={d.image} onChange={(v) => set("image", v)} testid="prop-hero-image" /></Field>
      </>);
    case "text":
      return (<>
        <Field label="العنوان"><input value={d.title || ""} onChange={(e) => set("title", e.target.value)} className={inputCls} /></Field>
        <Field label={<>النص <AiBtn kind="text" targetKey="body" /></>}><textarea value={d.body || ""} onChange={(e) => set("body", e.target.value)} className={inputCls} rows={6} data-testid="prop-text-body" /></Field>
      </>);
    case "services":
      return (<>
        <Field label="العنوان"><input value={d.title || ""} onChange={(e) => set("title", e.target.value)} className={inputCls} /></Field>
        <Field label="العنوان الفرعي"><input value={d.subtitle || ""} onChange={(e) => set("subtitle", e.target.value)} className={inputCls} /></Field>
        <Field label="الخدمات"><ListEditor items={d.items || []} onChange={(v) => set("items", v)} addLabel="إضافة خدمة" fields={[{ key: "title", label: "العنوان" }, { key: "description", label: "الوصف", type: "textarea" }]} /></Field>
      </>);
    case "gallery":
      return (<>
        <Field label="العنوان"><input value={d.title || ""} onChange={(e) => set("title", e.target.value)} className={inputCls} /></Field>
        <Field label="الصور">
          <div className="grid grid-cols-3 gap-2 mb-2">
            {(d.images || []).map((img, i) => (
              <div key={i} className="relative"><img src={mediaUrl(img)} alt="" className="w-full h-16 object-cover rounded-lg border" /><button onClick={() => set("images", d.images.filter((_, x) => x !== i))} className="absolute top-1 end-1 bg-red-500 text-white rounded-full w-5 h-5 grid place-items-center text-xs">×</button></div>
            ))}
          </div>
          <ImageUpload onChange={(v) => v && set("images", [...(d.images || []), v])} testid="prop-gallery-add" />
        </Field>
      </>);
    case "image":
      return (<>
        <Field label="الصورة"><ImageUpload value={d.image} onChange={(v) => set("image", v)} /></Field>
        <Field label="التسمية"><input value={d.caption || ""} onChange={(e) => set("caption", e.target.value)} className={inputCls} /></Field>
      </>);
    case "products":
      return (<>
        <Field label="العنوان"><input value={d.title || ""} onChange={(e) => set("title", e.target.value)} className={inputCls} /></Field>
        <Field label="المنتجات"><ListEditor items={d.items || []} onChange={(v) => set("items", v)} addLabel="إضافة منتج" fields={[{ key: "name", label: "الاسم" }, { key: "description", label: "الوصف", type: "textarea" }, { key: "price", label: "السعر" }, { key: "image", label: "صورة", type: "image" }]} /></Field>
      </>);
    case "testimonials":
      return (<>
        <Field label="العنوان"><input value={d.title || ""} onChange={(e) => set("title", e.target.value)} className={inputCls} /></Field>
        <Field label="الآراء"><ListEditor items={d.items || []} onChange={(v) => set("items", v)} addLabel="إضافة رأي" fields={[{ key: "name", label: "الاسم" }, { key: "role", label: "الصفة" }, { key: "text", label: "الرأي", type: "textarea" }]} /></Field>
      </>);
    case "faq":
      return (<>
        <Field label="العنوان"><input value={d.title || ""} onChange={(e) => set("title", e.target.value)} className={inputCls} /></Field>
        <Field label="الأسئلة"><ListEditor items={d.items || []} onChange={(v) => set("items", v)} addLabel="إضافة سؤال" fields={[{ key: "q", label: "السؤال" }, { key: "a", label: "الإجابة", type: "textarea" }]} /></Field>
      </>);
    case "contact":
      return (<>
        <Field label="العنوان"><input value={d.title || ""} onChange={(e) => set("title", e.target.value)} className={inputCls} /></Field>
        <Field label="العنوان الفرعي"><input value={d.subtitle || ""} onChange={(e) => set("subtitle", e.target.value)} className={inputCls} /></Field>
        <label className="flex items-center gap-2 text-sm mb-2"><input type="checkbox" checked={!!d.show_email} onChange={(e) => set("show_email", e.target.checked)} /> عرض البريد</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!d.show_phone} onChange={(e) => set("show_phone", e.target.checked)} /> عرض الجوال</label>
      </>);
    case "map":
      return (<>
        <Field label="العنوان"><input value={d.title || ""} onChange={(e) => set("title", e.target.value)} className={inputCls} /></Field>
        <Field label="الموقع/العنوان"><input value={d.address || ""} onChange={(e) => set("address", e.target.value)} className={inputCls} /></Field>
      </>);
    case "footer":
      return <Field label="نص التذييل"><input value={d.text || ""} onChange={(e) => set("text", e.target.value)} className={inputCls} /></Field>;
    default: return <p className="text-slate-400 text-sm">لا توجد خصائص.</p>;
  }
}

export default function Editor() {
  const { siteId } = useParams();
  const navigate = useNavigate();
  const [site, setSite] = useState(null);
  const [pageId, setPageId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [device, setDevice] = useState("desktop");
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("sections");

  useEffect(() => {
    api.get(`/sites/${siteId}`).then((r) => {
      setSite(r.data);
      const home = (r.data.pages || []).find((p) => p.is_home) || r.data.pages?.[0];
      setPageId(home?.id);
    }).catch(() => { toast.error("تعذّر تحميل الموقع"); navigate("/dashboard"); });
  }, [siteId, navigate]);

  if (!site) return <div className="min-h-screen grid place-items-center"><Loader2 className="w-8 h-8 animate-spin brand-accent-text" /></div>;

  const pages = site.pages || [];
  const page = pages.find((p) => p.id === pageId) || pages[0];
  const sections = page?.sections || [];
  const selected = sections.find((s) => s.id === selectedId);

  const updatePage = (updater) => {
    setSite((prev) => ({ ...prev, pages: prev.pages.map((p) => (p.id === page.id ? updater(p) : p)) }));
  };
  const updateSection = (updated) => updatePage((p) => ({ ...p, sections: p.sections.map((s) => (s.id === updated.id ? updated : s)) }));
  const addSection = (type) => {
    const sec = defaultSection(type);
    updatePage((p) => ({ ...p, sections: [...p.sections, sec] }));
    setSelectedId(sec.id);
    setTab("properties");
  };
  const removeSection = (id) => { updatePage((p) => ({ ...p, sections: p.sections.filter((s) => s.id !== id) })); if (selectedId === id) setSelectedId(null); };
  const moveSection = (id, dir) => updatePage((p) => {
    const idx = p.sections.findIndex((s) => s.id === id);
    const ni = idx + dir;
    if (ni < 0 || ni >= p.sections.length) return p;
    const arr = [...p.sections];
    [arr[idx], arr[ni]] = [arr[ni], arr[idx]];
    return { ...p, sections: arr };
  });

  const addPage = () => {
    const id = `page_${Math.random().toString(36).slice(2, 7)}`;
    const np = { id, title: "صفحة جديدة", slug: id, is_home: false, seo: { title: "", description: "", image: "" }, sections: [] };
    setSite((prev) => ({ ...prev, pages: [...prev.pages, np] }));
    setPageId(id);
  };
  const deletePage = (id) => {
    if (pages.length <= 1) { toast.error("يجب أن تبقى صفحة واحدة على الأقل"); return; }
    setSite((prev) => ({ ...prev, pages: prev.pages.filter((p) => p.id !== id) }));
    if (pageId === id) setPageId(pages[0].id);
  };
  const setHome = (id) => setSite((prev) => ({ ...prev, pages: prev.pages.map((p) => ({ ...p, is_home: p.id === id })) }));
  const updatePageMeta = (key, val) => updatePage((p) => ({ ...p, [key]: val }));
  const updatePageSeo = (key, val) => updatePage((p) => ({ ...p, seo: { ...(p.seo || {}), [key]: val } }));

  const setBrand = (key, val) => setSite((prev) => ({ ...prev, brand: { ...prev.brand, [key]: val } }));
  const setBrandColor = (key, val) => setSite((prev) => ({ ...prev, brand: { ...prev.brand, colors: { ...(prev.brand?.colors || {}), [key]: val } } }));

  const save = async (publish = false) => {
    setSaving(true);
    try {
      await api.put(`/sites/${siteId}`, { name: site.name, brand: site.brand, pages: site.pages });
      if (publish) { await api.post(`/sites/${siteId}/publish`); toast.success("تم نشر الموقع"); setSite((p) => ({ ...p, status: "published" })); }
      else toast.success("تم حفظ المسودة");
    } catch (err) { toast.error(apiError(err.response?.data?.detail)); }
    setSaving(false);
  };

  return (
    <div className="h-screen flex flex-col bg-slate-100" data-testid="editor-page">
      {/* Top bar */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")} className="text-slate-500 hover:brand-text" data-testid="editor-back"><ArrowRight className="w-5 h-5" /></button>
          <input value={site.name} onChange={(e) => setSite({ ...site, name: e.target.value })} className="font-head font-extrabold brand-text bg-transparent outline-none text-lg" data-testid="editor-site-name" />
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:inline-flex bg-slate-100 rounded-lg p-1">
            <button onClick={() => setDevice("desktop")} className={`p-1.5 rounded ${device === "desktop" ? "bg-white shadow" : ""}`} data-testid="device-desktop"><Monitor className="w-4 h-4" /></button>
            <button onClick={() => setDevice("mobile")} className={`p-1.5 rounded ${device === "mobile" ? "bg-white shadow" : ""}`} data-testid="device-mobile"><Smartphone className="w-4 h-4" /></button>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.open(`/s/${site.subdomain}`, "_blank")} className="rounded-lg" data-testid="editor-preview"><Eye className="w-4 h-4 ms-1" /> معاينة</Button>
          <Button size="sm" onClick={() => save(false)} disabled={saving} variant="outline" className="rounded-lg" data-testid="editor-save"><Save className="w-4 h-4 ms-1" /> حفظ</Button>
          <Button size="sm" onClick={() => save(true)} disabled={saving} className="brand-bg text-white rounded-lg" data-testid="editor-publish">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Rocket className="w-4 h-4 ms-1" /> نشر</>}</Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left/Right panels use logical order; in RTL first child is on the right */}
        <aside className="w-72 bg-white border-e border-slate-200 flex flex-col shrink-0 overflow-hidden">
          <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid grid-cols-3 m-2">
              <TabsTrigger value="sections" data-testid="tab-sections">أقسام</TabsTrigger>
              <TabsTrigger value="properties" data-testid="tab-properties">خصائص</TabsTrigger>
              <TabsTrigger value="design" data-testid="tab-design">تصميم</TabsTrigger>
            </TabsList>

            <TabsContent value="sections" className="flex-1 overflow-y-auto px-3 pb-4 mt-0">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2"><span className="text-xs font-bold text-slate-500">الصفحات</span><button onClick={addPage} className="brand-accent-text" data-testid="add-page-btn"><Plus className="w-4 h-4" /></button></div>
                <div className="space-y-1">
                  {pages.map((p) => (
                    <div key={p.id} className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm ${p.id === pageId ? "brand-bg text-white" : "hover:bg-slate-50"}`}>
                      <button onClick={() => setPageId(p.id)} className="flex-1 text-start truncate flex items-center gap-1" data-testid={`page-${p.id}`}>{p.is_home && <Home className="w-3 h-3" />} {p.title}</button>
                      {!p.is_home && <button onClick={() => setHome(p.id)} title="تعيين رئيسية" className={p.id === pageId ? "text-white/70" : "text-slate-400"}><Home className="w-3.5 h-3.5" /></button>}
                      {pages.length > 1 && <button onClick={() => deletePage(p.id)} className={p.id === pageId ? "text-white/70" : "text-red-400"}><Trash2 className="w-3.5 h-3.5" /></button>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="mb-3">
                <span className="text-xs font-bold text-slate-500 block mb-2">أقسام الصفحة</span>
                <div className="space-y-1">
                  {sections.map((s, i) => (
                    <div key={s.id} className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm border ${selectedId === s.id ? "border-[var(--brand-accent)] bg-blue-50" : "border-slate-200"}`}>
                      <button onClick={() => { setSelectedId(s.id); setTab("properties"); }} className="flex-1 text-start truncate" data-testid={`section-item-${s.id}`}>{SECTION_TYPES.find((t) => t.type === s.type)?.label || s.type}</button>
                      <button onClick={() => moveSection(s.id, -1)} disabled={i === 0} className="text-slate-400 disabled:opacity-30"><ChevronUp className="w-3.5 h-3.5" /></button>
                      <button onClick={() => moveSection(s.id, 1)} disabled={i === sections.length - 1} className="text-slate-400 disabled:opacity-30"><ChevronDown className="w-3.5 h-3.5" /></button>
                      <button onClick={() => removeSection(s.id)} className="text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
              </div>
              <span className="text-xs font-bold text-slate-500 block mb-2">إضافة قسم</span>
              <div className="grid grid-cols-2 gap-2">
                {SECTION_TYPES.map((t) => (
                  <button key={t.type} onClick={() => addSection(t.type)} data-testid={`add-section-${t.type}`}
                    className="flex flex-col items-center gap-1 p-3 rounded-lg border border-slate-200 hover:border-[var(--brand-accent)] hover:bg-blue-50 transition-colors text-xs">
                    <t.icon className="w-5 h-5 brand-accent-text" /> {t.label}
                  </button>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="properties" className="flex-1 overflow-y-auto px-3 pb-4 mt-0">
              {selected ? (
                <>
                  <h3 className="font-bold brand-text mb-3">{SECTION_TYPES.find((t) => t.type === selected.type)?.label}</h3>
                  <SectionProperties section={selected} onChange={updateSection} siteName={site.name} />
                </>
              ) : (
                <div className="text-center text-slate-400 mt-10 text-sm">اختر قسمًا لتعديل خصائصه</div>
              )}
              {page && (
                <div className="mt-6 pt-4 border-t border-slate-200">
                  <h3 className="font-bold brand-text mb-3 text-sm">إعدادات الصفحة</h3>
                  <Field label="اسم الصفحة"><input value={page.title} onChange={(e) => updatePageMeta("title", e.target.value)} className={inputCls} data-testid="page-title-input" /></Field>
                  <Field label="رابط الصفحة (slug)"><input value={page.slug} onChange={(e) => updatePageMeta("slug", e.target.value)} className={inputCls} dir="ltr" /></Field>
                  <Field label="عنوان SEO"><input value={page.seo?.title || ""} onChange={(e) => updatePageSeo("title", e.target.value)} className={inputCls} /></Field>
                  <Field label="وصف SEO"><textarea value={page.seo?.description || ""} onChange={(e) => updatePageSeo("description", e.target.value)} className={inputCls} rows={2} /></Field>
                  <Field label="صورة المشاركة"><ImageUpload value={page.seo?.image} onChange={(v) => updatePageSeo("image", v)} /></Field>
                </div>
              )}
            </TabsContent>

            <TabsContent value="design" className="flex-1 overflow-y-auto px-3 pb-4 mt-0">
              <h3 className="font-bold brand-text mb-3 flex items-center gap-2"><Palette className="w-4 h-4" /> هوية الموقع</h3>
              <Field label="الشعار"><ImageUpload value={site.brand?.logo} onChange={(v) => setBrand("logo", v)} testid="brand-logo" /></Field>
              <Field label="اللون الأساسي"><input type="color" value={site.brand?.colors?.primary || "#0A2540"} onChange={(e) => setBrandColor("primary", e.target.value)} className="w-full h-10 rounded-lg border" data-testid="brand-primary" /></Field>
              <Field label="اللون الثانوي"><input type="color" value={site.brand?.colors?.secondary || "#D4AF37"} onChange={(e) => setBrandColor("secondary", e.target.value)} className="w-full h-10 rounded-lg border" /></Field>
              <Field label="لون التمييز"><input type="color" value={site.brand?.colors?.accent || "#2563EB"} onChange={(e) => setBrandColor("accent", e.target.value)} className="w-full h-10 rounded-lg border" /></Field>
              <Field label="الخط"><select value={site.brand?.font || "Tajawal"} onChange={(e) => setBrand("font", e.target.value)} className={inputCls}><option value="Tajawal">Tajawal</option><option value="Cairo">Cairo</option></select></Field>
            </TabsContent>
          </Tabs>
        </aside>

        {/* Canvas */}
        <main className="flex-1 overflow-y-auto p-4">
          <div className={`mx-auto bg-white rounded-xl overflow-hidden soft-shadow transition-all duration-300 ${device === "mobile" ? "max-w-[390px]" : "max-w-full"}`}
            style={{ "--brand-primary": site.brand?.colors?.primary, "--brand-secondary": site.brand?.colors?.secondary, "--brand-accent": site.brand?.colors?.accent, fontFamily: site.brand?.font }}
            data-testid="editor-canvas">
            {sections.length === 0 ? (
              <div className="grid place-items-center py-32 text-slate-300"><Layers className="w-12 h-12 mb-3" /><p>أضف أقسامًا من اللوحة الجانبية</p></div>
            ) : sections.map((s) => (
              <div key={s.id} onClick={() => { setSelectedId(s.id); setTab("properties"); }} className={`relative cursor-pointer ${selectedId === s.id ? "ring-2 ring-inset ring-[var(--brand-accent)]" : ""}`}>
                <SectionRenderer section={s} settings={{ contact_email: "", contact_phone: "" }} />
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
