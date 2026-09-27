import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, ArrowLeft } from "lucide-react";

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [cat, setCat] = useState("all");
  const [preview, setPreview] = useState(null);

  useEffect(() => { api.get("/public/templates").then((r) => setTemplates(r.data)).catch(() => {}); }, []);

  const cats = ["all", ...Array.from(new Set(templates.map((t) => t.category)))];
  const filtered = cat === "all" ? templates : templates.filter((t) => t.category === cat);

  return (
    <div className="max-w-7xl mx-auto px-6 py-16" data-testid="templates-page">
      <div className="text-center mb-10">
        <h1 className="font-head text-4xl sm:text-5xl font-extrabold brand-text mb-3">قوالب احترافية</h1>
        <p className="text-slate-600 max-w-2xl mx-auto">اختر قالبًا يناسب نشاطك، عاينه، ثم ابدأ التحرير مباشرة من لوحة التحكم.</p>
      </div>

      <div className="flex flex-wrap justify-center gap-2 mb-10">
        {cats.map((c) => (
          <button key={c} onClick={() => setCat(c)} data-testid={`tpl-cat-${c}`}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${cat === c ? "brand-bg text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
            {c === "all" ? "الكل" : c}
          </button>
        ))}
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((t) => (
          <div key={t.id} className="group rounded-2xl overflow-hidden border border-slate-200 bg-white soft-shadow transition-transform duration-200 hover:-translate-y-2" data-testid={`template-card-${t.id}`}>
            <div className="aspect-[4/3] overflow-hidden bg-slate-100 relative">
              <img src={t.thumbnail} alt={t.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
              <button onClick={() => setPreview(t)} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-semibold gap-2" data-testid={`template-preview-${t.id}`}>
                <Eye className="w-5 h-5" /> معاينة
              </button>
            </div>
            <div className="p-5">
              <span className="text-xs gold-text font-bold">{t.category}</span>
              <h3 className="font-bold text-lg brand-text mt-1">{t.name}</h3>
              <p className="text-slate-600 text-sm mt-1 mb-4 line-clamp-2">{t.description}</p>
              <Link to="/register"><Button className="w-full brand-bg text-white rounded-full">استخدم هذا القالب</Button></Link>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle className="font-head text-2xl brand-text text-start">{preview?.name}</DialogTitle></DialogHeader>
          {preview && (
            <div>
              <img src={preview.thumbnail} alt={preview.name} className="w-full rounded-xl soft-shadow mb-4" />
              <p className="text-slate-600 mb-4">{preview.description}</p>
              <Link to="/register"><Button className="w-full brand-bg text-white rounded-full">إنشاء موقع بهذا القالب <ArrowLeft className="w-4 h-4 ms-1" /></Button></Link>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
