import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { api, apiError } from "@/lib/api";
import { usePageMeta } from "@/lib/usePageMeta";
import { Button } from "@/components/ui/button";
import SectionRenderer from "@/components/SectionRenderer";
import TemplateTheme from "@/components/TemplateTheme";
import { useBrand } from "@/context/BrandContext";
import {
  Wand2, Loader2, ArrowLeft, ArrowRight, Sparkles, RefreshCw,
  CheckCircle2, HelpCircle, XCircle, Globe, Rocket, LayoutList,
} from "lucide-react";

const EXAMPLES = [
  "مقهى مختص بالقهوة في الرياض",
  "عيادة أسنان حديثة في جدة",
  "متجر إلكتروني لبيع العطور",
  "شركة تصميم داخلي وديكور",
];

const STEPS = ["وصف نشاطك", "المعاينة", "النطاق", "الإطلاق"];

export default function StartWizard() {
  usePageMeta("المعالج الذكي", "أنشئ موقعًا كاملًا بالذكاء الاصطناعي من وصف نشاطك مع اقتراح نطاق مناسب.", { noindex: true });
  const navigate = useNavigate();
  const { settings } = useBrand();

  const [step, setStep] = useState(0);
  const [prompt, setPrompt] = useState("");
  const [gen, setGen] = useState(null); // {name, config}
  const [genLoading, setGenLoading] = useState(false);
  const [domains, setDomains] = useState(null); // [{domain, available, price, price_source}]
  const [domainsLoading, setDomainsLoading] = useState(false);
  const [chosenDomain, setChosenDomain] = useState(null); // null = free subdomain
  const [creating, setCreating] = useState(false);
  const [finishError, setFinishError] = useState("");

  const sections = gen?.config?.pages?.[0]?.sections || [];
  const colors = gen?.config?.brand?.colors;
  const font = gen?.config?.brand?.font;

  const generate = async () => {
    if (!prompt.trim()) { toast.error("صف نشاطك أولًا"); return; }
    setGenLoading(true);
    try {
      const { data } = await api.post("/ai/generate-template", { prompt });
      setGen(data);
      setStep(1);
    } catch (err) { toast.error(apiError(err.response?.data?.detail)); }
    setGenLoading(false);
  };

  const loadDomains = async () => {
    setStep(2);
    if (domains) return;
    setDomainsLoading(true);
    try {
      const { data } = await api.post("/ai/suggest-domains", { prompt, name: gen?.name || "" });
      const checks = await Promise.all(
        (data.suggestions || []).map(async (slug) => {
          try {
            const r = await api.get("/public/domain/search", { params: { q: slug } });
            const com = r.data.results.find((x) => x.tld === "com") || r.data.results[0];
            return { slug, domain: com.domain, available: com.available, price: com.price, currency: com.currency, price_source: com.price_source };
          } catch {
            return { slug, domain: `${slug}.com`, available: null, price: null, currency: "SAR", price_source: "indicative" };
          }
        })
      );
      setDomains(checks);
    } catch (err) { toast.error(apiError(err.response?.data?.detail)); setDomains([]); }
    setDomainsLoading(false);
  };

  const finish = async () => {
    setCreating(true);
    setFinishError("");
    try {
      const { data } = await api.post("/sites/from-ai", { name: gen.name, config: gen.config });
      if (chosenDomain) {
        try { localStorage.setItem("wanted_domain", chosenDomain); } catch { /* ignore */ }
      }
      toast.success("تم إنشاء موقعك بنجاح");
      navigate(`/editor/${data.id}`);
    } catch (err) {
      const msg = apiError(err.response?.data?.detail) || (err.response?.status === 403
        ? "وصلت للحد الأقصى للباقة المجانية (موقع واحد). قم بالترقية لإنشاء مواقع إضافية."
        : "تعذّر إنشاء الموقع، حاول مرة أخرى.");
      setFinishError(msg);
      toast.error(msg);
      setCreating(false);
    }
  };

  return (
    <div data-testid="start-wizard">
      {/* progress */}
      <div className="flex items-center justify-center gap-2 sm:gap-4 mb-8">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-2 sm:gap-4">
            <div className={`flex items-center gap-2 ${i <= step ? "brand-text" : "text-slate-400"}`}>
              <span className={`w-8 h-8 rounded-full grid place-items-center text-sm font-bold transition-colors ${i < step ? "bg-green-500 text-white" : i === step ? "brand-bg text-white" : "bg-slate-100 text-slate-400"}`}>
                {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </span>
              <span className="hidden sm:block text-sm font-semibold">{s}</span>
            </div>
            {i < STEPS.length - 1 && <span className={`w-6 sm:w-12 h-0.5 ${i < step ? "bg-green-500" : "bg-slate-200"}`} />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* STEP 0 — describe */}
        {step === 0 && (
          <motion.div key="s0" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 soft-shadow p-8 text-center">
            <span className="w-14 h-14 rounded-2xl brand-gradient text-white grid place-items-center mx-auto mb-5"><Wand2 className="w-7 h-7" /></span>
            <h1 className="font-head text-3xl font-extrabold brand-text mb-2">صف نشاطك، ودَع الباقي علينا</h1>
            <p className="text-slate-600 mb-6">اكتب جملة أو جملتين عن نشاطك، وسننشئ لك موقعًا عربيًا كاملًا بالمحتوى المناسب.</p>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} data-testid="wizard-prompt"
              placeholder="مثال: مطعم مأكولات بحرية عائلي في جدة يقدّم أطباقًا طازجة"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[var(--brand-accent)] focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] text-start mb-4" />
            <div className="flex flex-wrap gap-2 justify-center mb-6">
              {EXAMPLES.map((e) => (
                <button key={e} onClick={() => setPrompt(e)} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full px-3 py-1.5 transition-colors">{e}</button>
              ))}
            </div>
            <Button onClick={generate} disabled={genLoading} className="brand-bg text-white rounded-full px-8 py-6 text-base" data-testid="wizard-generate-btn">
              {genLoading ? <><Loader2 className="w-5 h-5 animate-spin ms-2" /> يُنشئ موقعك...</> : <><Sparkles className="w-5 h-5 ms-2" /> أنشئ موقعي</>}
            </Button>
          </motion.div>
        )}

        {/* STEP 1 — preview */}
        {step === 1 && gen && (
          <motion.div key="s1" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="max-w-5xl mx-auto">
            <div className="text-center mb-5">
              <span className="text-xs gold-text font-bold">تم إنشاء موقعك</span>
              <h2 className="font-head text-3xl font-extrabold brand-text" data-testid="wizard-site-name">{gen.name}</h2>
              <p className="text-slate-500 text-sm mt-1 flex items-center justify-center gap-1"><LayoutList className="w-4 h-4" /> {sections.length} قسم جاهز</p>
            </div>
            <div className="bg-white rounded-2xl overflow-hidden soft-shadow-lg border border-slate-200 mx-auto max-w-4xl" data-testid="wizard-preview">
              <div className="flex items-center gap-1.5 px-4 h-9 bg-slate-100 border-b border-slate-200">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" /><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /><span className="w-2.5 h-2.5 rounded-full bg-green-400" />
              </div>
              <div className="max-h-[52vh] overflow-y-auto no-scrollbar">
                <TemplateTheme colors={colors} font={font}>
                  {sections.map((s) => <SectionRenderer key={s.id} section={s} settings={settings} onContact={() => false} onOrder={() => false} />)}
                </TemplateTheme>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3 mt-6">
              <Button variant="outline" onClick={generate} disabled={genLoading} className="rounded-full" data-testid="wizard-regenerate-btn">
                {genLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><RefreshCw className="w-4 h-4 ms-1" /> أعد التوليد</>}
              </Button>
              <Button onClick={loadDomains} className="brand-bg text-white rounded-full px-8" data-testid="wizard-to-domains-btn">
                متابعة <ArrowLeft className="w-4 h-4 ms-1" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* STEP 2 — domain */}
        {step === 2 && (
          <motion.div key="s2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <span className="w-14 h-14 rounded-2xl brand-gradient text-white grid place-items-center mx-auto mb-4"><Globe className="w-7 h-7" /></span>
              <h2 className="font-head text-3xl font-extrabold brand-text mb-2">اختر عنوان موقعك</h2>
              <p className="text-slate-600">ابدأ بنطاق فرعي مجاني الآن، أو اختر نطاقًا خاصًا مقترحًا (الشراء قريبًا).</p>
            </div>

            {/* free subdomain */}
            <button onClick={() => setChosenDomain(null)} data-testid="wizard-free-subdomain"
              className={`w-full flex items-center justify-between gap-3 rounded-xl border-2 p-4 mb-3 transition-colors ${chosenDomain === null ? "border-[var(--brand-accent)] bg-blue-50/40" : "border-slate-200 bg-white"}`}>
              <span className="flex items-center gap-2"><CheckCircle2 className={`w-5 h-5 ${chosenDomain === null ? "brand-accent-text" : "text-slate-300"}`} />
                <span className="text-start"><span className="font-bold brand-text block" dir="ltr">yoursite.منصتي</span><span className="text-xs text-slate-500">نطاق فرعي مجاني — جاهز فورًا</span></span>
              </span>
              <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-1 font-bold">مجاني</span>
            </button>

            <div className="text-center text-xs text-slate-400 my-3">نطاقات خاصة مقترحة لنشاطك</div>

            {domainsLoading ? (
              <div className="grid place-items-center py-10" data-testid="wizard-domains-loading"><Loader2 className="w-7 h-7 animate-spin brand-accent-text" /></div>
            ) : (
              <div className="space-y-2" data-testid="wizard-domain-list">
                {(domains || []).map((d) => (
                  <button key={d.slug} onClick={() => setChosenDomain(d.domain)} data-testid={`wizard-domain-${d.slug}`}
                    className={`w-full flex items-center justify-between gap-3 rounded-xl border-2 p-4 transition-colors ${chosenDomain === d.domain ? "border-[var(--brand-accent)] bg-blue-50/40" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                    <span className="flex items-center gap-2">
                      <span className="font-bold brand-text" dir="ltr">{d.domain}</span>
                      {d.available === true && <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-600 rounded-full px-2 py-0.5"><CheckCircle2 className="w-3 h-3" /> متوفر</span>}
                      {d.available === false && <span className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-500 rounded-full px-2 py-0.5"><XCircle className="w-3 h-3" /> محجوز</span>}
                      {d.available == null && <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-500 rounded-full px-2 py-0.5"><HelpCircle className="w-3 h-3" /> غير مؤكد</span>}
                    </span>
                    {d.price != null && <span className="text-sm text-slate-500">{d.price} {d.currency}{d.price_source === "indicative" && <span className="text-[10px] text-amber-600"> (تقديري)</span>}</span>}
                  </button>
                ))}
                {domains && domains.length === 0 && <p className="text-center text-slate-400 text-sm py-4">تعذّر توليد اقتراحات، يمكنك المتابعة بالنطاق المجاني.</p>}
              </div>
            )}

            {chosenDomain && <p className="text-center text-xs text-slate-400 mt-3">سنحفظ اختيارك، ويمكنك شراء النطاق لاحقًا بعد تفعيل الدفع. سيُنشأ موقعك الآن على النطاق الفرعي المجاني.</p>}

            {finishError && (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm text-center" data-testid="wizard-finish-error">
                {finishError}
                <a href="/dashboard/billing" className="block mt-2 brand-accent-text font-bold">عرض الباقات والترقية ←</a>
              </div>
            )}

            <div className="flex items-center justify-center gap-3 mt-8">
              <Button variant="outline" onClick={() => setStep(1)} className="rounded-full" data-testid="wizard-back-btn"><ArrowRight className="w-4 h-4 me-1" /> رجوع</Button>
              <Button onClick={finish} disabled={creating} className="brand-bg text-white rounded-full px-8" data-testid="wizard-finish-btn">
                {creating ? <><Loader2 className="w-4 h-4 animate-spin ms-1" /> يُنشئ...</> : <><Rocket className="w-4 h-4 ms-1" /> أنشئ موقعي وابدأ التحرير</>}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
