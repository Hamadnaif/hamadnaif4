import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { usePageMeta } from "@/lib/usePageMeta";
import { Button } from "@/components/ui/button";
import { HomeHero } from "@/components/HomeHero";
import {
  ArrowLeft, MousePointerClick, Rocket, Globe,
  Palette, Smartphone, Search, CheckCircle2, ChevronDown, Wand2,
} from "lucide-react";
const STEPS = [
  { icon: Wand2, title: "صِف نشاطك", text: "اكتب جملة عن نشاطك، أو اختر قالبًا جاهزًا يناسبك." },
  { icon: MousePointerClick, title: "خصّص بسهولة", text: "عدّل النصوص والصور والألوان من محرّر عربي بسيط." },
  { icon: Rocket, title: "شارك موقعك", text: "راجع موقعك، انشره، وشاركه مع عملائك عبر رابط الموقع." },
];
const FEATURES = [
  { icon: Wand2, title: "من فكرة إلى بداية ذكية", text: "صف نشاطك بكلماتك، ودع الذكاء الاصطناعي يقترح لك المحتوى والأقسام. راجعها وأضف لمستك قبل النشر." },
  { icon: Palette, title: "هوية تشبهك", text: "شعارك، ألوانك وخطوطك. كل تفصيلة تعبّر عن مشروعك، لا عن القالب." },
  { icon: Smartphone, title: "حضور على كل شاشة", text: "عاين موقعك على الجوال والكمبيوتر قبل مشاركته مع عملائك." },
  { icon: Globe, title: "عنوان لفكرتك", text: "ابحث عن اسم نطاق مناسب. تفعيل الربط والشراء مرتبط بجاهزية خدمة النطاقات." },
  { icon: Search, title: "محتوى يسهل الوصول إليه", text: "أضف عنوانًا ووصفًا لكل صفحة من إعدادات محرّك البحث في المحرّر." },
];
const FAQS = [
  { q: "هل أحتاج خبرة تقنية؟", a: "لا، المحرر يعتمد على أقسام جاهزة تضيفها وترتّبها بسهولة، ويمكنك توليد موقع كامل بالذكاء الاصطناعي من وصف واحد." },
  { q: "هل يمكنني ربط نطاقي الخاص؟", a: "نعم، تدعم المنصة ربط نطاق تملكه مع إرشادات سجلات DNS، بالإضافة إلى نطاق فرعي مجاني." },
  { q: "كيف يتم الدفع؟", a: "يمكنك إنشاء موقعك مجانًا الآن. الدفع الإلكتروني عبر بوابة محلية قيد التفعيل، والأسعار المعروضة تجريبية قابلة للتعديل قبل الإطلاق الرسمي." },
  { q: "ماذا يحدث عند انتهاء الاشتراك؟", a: "لا نحذف محتواك تلقائيًا. عند انتهاء الاشتراك المدفوع يعود حسابك إلى حدود الباقة المجانية، ويبقى بإمكانك الدخول والتحرير، وقد يتوقف عرض المواقع التي تتجاوز حدود المجاني حتى التجديد. تُحفظ بياناتك لمدة معقولة قبل أي إجراء." },
];

export default function Home() {
  usePageMeta("فكرتك تبدأ بموقع", "منصتي — فكرتك تبدأ بموقع. أنشئ موقعًا عربيًا يشبه مشروعك، خصّص هويتك ومحتواك، وابدأ مجانًا دون خبرة برمجية.");
  const [templates, setTemplates] = useState([]);
  const [plans, setPlans] = useState([]);
  const [faqOpen, setFaqOpen] = useState(0);

  useEffect(() => {
    api.get("/public/templates").then((r) => setTemplates(r.data.slice(0, 8))).catch(() => {});
    api.get("/public/plans").then((r) => setPlans(r.data)).catch(() => {});
  }, []);

  return (
    <div data-testid="home-page">
      <HomeHero />

      <section className="max-w-7xl mx-auto px-6 sm:px-8 py-20">
        <div className="mb-10">
          <span className="text-sm font-bold brand-accent-text">من أين تبدأ؟</span>
          <h2 className="font-head text-base md:text-lg font-extrabold brand-text mt-3" data-testid="home-steps-title">ثلاث خطوات، وفكرتك تأخذ شكلها</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {STEPS.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="relative py-6 ps-6 border-s border-blue-200" data-testid={`home-step-${i}`}>
              <div className="flex items-center justify-between mb-5"><s.icon className="w-7 h-7 brand-accent-text" /><span className="text-3xl font-bold text-slate-300" aria-hidden="true">0{i + 1}</span></div>
              <h3 className="font-bold text-lg brand-text mb-2">{s.title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{s.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 sm:px-8 pb-20">
        <div className="flex items-end justify-between gap-6 mb-9">
          <div><span className="brand-accent-text font-bold text-sm">أدوات صغيرة. إمكانات كبيرة.</span><h2 className="font-head text-base md:text-lg font-extrabold brand-text mt-3">موقعك، على طريقتك</h2></div>
          <p className="text-slate-500 text-sm hidden sm:block">أنت صاحب الفكرة. ونحن نسهّل الباقي.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <div key={f.title} className={`relative overflow-hidden rounded-2xl p-7 sm:p-9 border ${i === 0 ? "md:col-span-2 lg:col-span-1 lg:row-span-2 identity-dark text-white border-transparent" : "bg-white border-slate-200/80"}`} data-testid={`home-feature-${i}`}>
              {i === 0 && <img src="/brand/mark-light.webp" alt="" className="w-28 h-28 object-contain mb-10" loading="lazy" />}
              <f.icon className={`w-6 h-6 mb-4 ${i === 0 ? "text-blue-300" : "brand-accent-text"}`} />
              <h3 className={`font-bold text-lg mb-3 ${i === 0 ? "text-white" : "brand-text"}`}>{f.title}</h3>
              <p className={`text-sm leading-[1.9] ${i === 0 ? "text-white/75" : "text-slate-500"}`}>{f.text}</p>
              {i === 0 && <Link to="/register" className="inline-flex items-center gap-2 text-blue-200 font-bold text-sm mt-8 hover:text-white transition-colors" data-testid="home-ai-start">جرّب البداية الذكية <ArrowLeft className="w-4 h-4" /></Link>}
            </div>
          ))}
        </div>
      </section>

      {/* Templates preview */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="font-head text-base md:text-lg font-extrabold brand-text">قوالب جاهزة للانطلاق</h2>
            <p className="text-slate-600 mt-2">اختر ما يناسب نشاطك وعايِنه حيًّا قبل التحرير.</p>
          </div>
          <Link to="/templates" data-testid="home-all-templates" className="inline-flex items-center gap-1 brand-accent-text font-semibold hover:text-blue-800 transition-colors whitespace-nowrap text-sm">عرض الكل <ArrowLeft className="w-4 h-4" /></Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {templates.map((t) => (
            <Link to="/templates" key={t.id} className="group rounded-2xl overflow-hidden border border-slate-200 bg-white hover-lift" data-testid={`home-template-${t.id}`}>
              <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                <img src={t.thumbnail} alt={t.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
              </div>
              <div className="p-4">
                <span className="text-xs gold-text font-bold">{t.category}</span>
                <h3 className="font-bold brand-text">{t.name}</h3>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Pricing preview */}
      <section className="bg-[#F8F9FB] py-20 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="font-head text-base md:text-lg font-extrabold brand-text">باقات مرنة</h2>
            <p className="text-slate-600 mt-3">أسعار تجريبية قابلة للتعديل قبل الإطلاق الرسمي.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
            {plans.map((p) => (
              <div key={p.id} className={`rounded-2xl p-7 bg-white border transition-transform hover:-translate-y-1 ${p.highlight ? "border-[var(--brand-accent)] soft-shadow-lg md:scale-105" : "border-slate-200 soft-shadow"}`}>
                {p.highlight && <span className="inline-block mb-3 text-xs font-bold brand-accent-bg text-white rounded-full px-3 py-1">الأكثر شيوعًا</span>}
                <h3 className="font-head text-xl font-extrabold brand-text">{p.name}</h3>
                <div className="my-4"><span className="text-4xl font-extrabold brand-text">{p.price_monthly}</span><span className="text-slate-500"> {p.currency}/شهر</span></div>
                <ul className="space-y-2 mb-6">
                  {(p.features || []).slice(0, 5).map((f, i) => <li key={i} className="flex items-center gap-2 text-slate-600 text-sm"><CheckCircle2 className="w-4 h-4 text-green-500" /> {f}</li>)}
                </ul>
                <Button asChild className={`w-full rounded-xl ${p.highlight ? "brand-accent-bg text-white" : "brand-bg text-white"}`}><Link to="/pricing" data-testid={`home-plan-select-${p.id}`}>استكشف الباقة</Link></Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 py-20">
        <h2 className="font-head text-base md:text-lg font-extrabold brand-text text-center mb-10">الأسئلة الشائعة</h2>
        <div className="space-y-3">
          {FAQS.map((f, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <button className="w-full flex items-center justify-between gap-3 p-5 text-start font-bold brand-text" onClick={() => setFaqOpen(faqOpen === i ? -1 : i)} data-testid={`faq-${i}`} aria-expanded={faqOpen === i} aria-controls={`faq-answer-${i}`}>
                {f.q}<ChevronDown className={`w-5 h-5 shrink-0 transition-transform duration-200 ${faqOpen === i ? "rotate-180" : ""}`} />
              </button>
              {faqOpen === i && <div id={`faq-answer-${i}`} data-testid={`faq-answer-${i}`} className="px-5 pb-5 text-slate-600 leading-relaxed">{f.a}</div>}
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
