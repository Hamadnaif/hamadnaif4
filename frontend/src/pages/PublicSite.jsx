import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, apiError, mediaUrl } from "@/lib/api";
import SectionRenderer from "@/components/SectionRenderer";
import { Loader2, Frown } from "lucide-react";

export default function PublicSite() {
  const { subdomain } = useParams();
  const [site, setSite] = useState(undefined);
  const [pageId, setPageId] = useState(null);

  useEffect(() => {
    api.get(`/public/site/${subdomain}`).then((r) => {
      setSite(r.data);
      const home = (r.data.pages || []).find((p) => p.is_home) || r.data.pages?.[0];
      setPageId(home?.id);
      const seo = home?.seo || {};
      if (seo.title) document.title = seo.title;
    }).catch(() => setSite(null));
  }, [subdomain]);

  const onContact = async (form) => {
    try { await api.post(`/public/site/${subdomain}/contact`, form); return true; }
    catch { return false; }
  };

  const onOrder = async (order) => {
    try { await api.post(`/public/site/${subdomain}/order`, order); return true; }
    catch { return false; }
  };

  if (site === undefined) return <div className="min-h-screen grid place-items-center"><Loader2 className="w-8 h-8 animate-spin brand-accent-text" /></div>;
  if (site === null) return (
    <div className="min-h-screen grid place-items-center bg-slate-50 text-center px-6">
      <div><Frown className="w-14 h-14 text-slate-300 mx-auto mb-4" /><h1 className="font-head text-2xl font-extrabold text-slate-700">الموقع غير متاح</h1><p className="text-slate-500 mt-2">قد يكون الموقع غير منشور أو الرابط غير صحيح.</p></div>
    </div>
  );

  const pages = site.pages || [];
  const page = pages.find((p) => p.id === pageId) || pages[0];
  const brand = site.brand || {};
  const colors = brand.colors || {};

  return (
    <div style={{ "--brand-primary": colors.primary, "--brand-secondary": colors.secondary, "--brand-accent": colors.accent, fontFamily: brand.font || "Tajawal" }} data-testid="public-site">
      <nav className="sticky top-0 z-50 glass border-b border-slate-200/60">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {brand.logo ? <img src={mediaUrl(brand.logo)} alt={site.name} className="h-7" /> : null}
            <span className="font-head font-extrabold brand-text">{site.name}</span>
          </div>
          {pages.length > 1 && (
            <div className="flex gap-1 overflow-x-auto no-scrollbar">
              {pages.map((p) => (
                <button key={p.id} onClick={() => setPageId(p.id)} className={`px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap ${p.id === pageId ? "brand-bg text-white" : "text-slate-600"}`}>{p.title}</button>
              ))}
            </div>
          )}
        </div>
      </nav>
      <div>
        {(page?.sections || []).map((s) => (
          <SectionRenderer key={s.id} section={s} onContact={onContact} onOrder={onOrder} settings={{ contact_email: "", contact_phone: "" }} />
        ))}
      </div>
    </div>
  );
}
