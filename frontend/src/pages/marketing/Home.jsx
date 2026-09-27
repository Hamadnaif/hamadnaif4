import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, LayoutTemplate, MousePointerClick, Rocket, Globe,
  Palette, ShieldCheck, Smartphone, Search, CheckCircle2, ChevronDown, Sparkles,
} from "lucide-react";

const HERO_IMG = "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1600&auto=format&fit=crop";
const MOCKUP = "https://static.prod-images.emergentagent.com/jobs/e8d6ac26-3fd6-4335-afc1-2269c0b714d9/images/c2ba4ed83b8e43568afdc182133cf4c28ea4dfd7dabd02a54cb47b88f966c192.jpeg";

const PARTNERS = ["مدى", "Apple Pay", "Visa", "Mastercard", "Moyasar", "STC Pay"];
const STATS = [
  { value: "6+", label: "قوالب جاهزة" },
  { value: "11", label: "نوع قسم قابل للتخصيص" },
  { value: "0%", label: "عمولة على مبيعاتك" },
  { value: "RTL", label: "دعم عربي كامل" },
];
const COMPARE = [
  { f: "إطلاق موقع خلال دقائق", us: true, other: false },
  { f: "تحكم كامل بالهوية والألوان والخط", us: true, other: false },
  { f: "توليد محتوى عربي بالذكاء الاصطناعي", us: true, other: false },
  { f: "نطاق فرعي مجاني + ربط نطاقك الخاص", us: true, other: true },
  { f: "بدون خبرة برمجية", us: true, other: false },
  { f: "لوحة تحكم عربية واضحة", us: true, other: true },
];

const STEPS = [
  { icon: LayoutTemplate, title: "اختر قالبًا", text: "ابدأ من قالب احترافي جاهز يناسب نشاطك." },
  { icon: MousePointerClick, title: "عدّل المحتوى", text: "أضف أقسامك وحرّر النصوص والصور بسهولة." },
  { icon: Rocket, title: "انشر موقعك", text: "انشر على رابط فرعي فوري أو اربط نطاقك الخاص." },
];

const FEATURES = [
  { icon: Palette, title: "تحكّم كامل بالهوية", text: "غيّر الألوان والخطوط والشعار ليعبّر عن علامتك." },
  { icon: Smartphone, title: "متجاوب على الجوال", text: "مواقعك تظهر باحترافية على جميع الأجهزة." },
  { icon: Globe, title: "نطاق خاص", text: "اربط نطاقك أو احصل على نطاق فرعي مجاني." },
  { icon: Search, title: "جاهز لمحركات البحث", text: "بنية سريعة قابلة للفهرسة مع إعدادات SEO." },
  { icon: ShieldCheck, title: "أمان وعزل بيانات", text: "بياناتك ومواقعك معزولة وآمنة تمامًا." },
  { icon: Sparkles, title: "مولّد محتوى ذكي", text: "اقتراحات نصوص عربية جاهزة أثناء التحرير." },
];

const FAQS = [
  { q: "هل أحتاج خبرة تقنية؟", a: "لا، المحرر يعتمد على أقسام جاهزة تضيفها وترتّبها بسهولة دون أي برمجة." },
  { q: "هل يمكنني ربط نطاقي الخاص؟", a: "نعم، تدعم المنصة ربط نطاق تملكه مع إرشادات سجلات DNS، بالإضافة إلى نطاق فرعي مجاني." },
  { q: "كيف يتم الدفع؟", a: "سندعم بوابة دفع تناسب السوق السعودي. حاليًا الأسعار تجريبية وقابلة للتعديل قبل الإطلاق." },
  { q: "ماذا يحدث عند انتهاء الاشتراك؟", a: "لا نحذف محتواك تلقائيًا؛ يُعرض حال الحساب وفق سياسة واضحة يمكن مراجعتها." },
];

export default function Home() {
  const [templates, setTemplates] = useState([]);
  const [plans, setPlans] = useState([]);
  const [faqOpen, setFaqOpen] = useState(0);

  useEffect(() => {
    api.get("/public/templates").then((r) => setTemplates(r.data.slice(0, 4))).catch(() => {});
    api.get("/public/plans").then((r) => setPlans(r.data)).catch(() => {});
  }, []);

  return (
    <div data-testid="home-page">
      {/* Hero */}
      <section className="relative overflow-hidden brand-bg text-white">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `url(${HERO_IMG})`, backgroundSize: "cover", backgroundPosition: "center" }} />
        <div className="absolute -top-24 -start-24 w-96 h-96 rounded-full" style={{ background: "radial-gradient(circle, rgba(212,175,55,0.35), transparent 70%)" }} />
        <div className="relative max-w-7xl mx-auto px-6 py-24 lg:py-32 grid lg:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-4 py-1.5 text-sm mb-6">
              <Sparkles className="w-4 h-4 gold-text" /> منصة عربية لإنشاء المواقع
            </span>
            <h1 className="font-head text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
              أنشئ موقعك الإلكتروني <span className="gold-text">باحترافية</span> خلال دقائق
            </h1>
            <p className="text-lg text-white/85 max-w-xl mb-8 leading-relaxed">
              اختر قالبًا، عدّل المحتوى بنفسك، وانشر موقعك على نطاق فرعي فوري أو اربط نطاقك الخاص — بلا أي خبرة تقنية.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/register"><Button className="bg-[var(--brand-secondary)] text-[#0A2540] hover:opacity-90 rounded-full px-8 py-6 text-base font-bold" data-testid="hero-start-btn">ابدأ الآن مجانًا <ArrowLeft className="w-4 h-4 ms-1" /></Button></Link>
              <Link to="/templates"><Button variant="outline" className="rounded-full px-8 py-6 text-base bg-transparent border-white/30 text-white hover:bg-white/10" data-testid="hero-templates-btn">تصفّح القوالب</Button></Link>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.2 }} className="hidden lg:block">
            <div className="rounded-3xl overflow-hidden soft-shadow-lg border border-white/10 bg-white/5">
              <img src={MOCKUP} alt="معاينة محرّر المواقع" className="w-full h-[420px] object-cover" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trust / integrations strip */}
      <section className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <p className="text-center text-slate-400 text-sm mb-5">تكاملات دفع جاهزة تناسب السوق السعودي والخليجي</p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {PARTNERS.map((p) => (
              <span key={p} className="text-slate-500 font-bold text-lg opacity-70 hover:opacity-100 transition-opacity">{p}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Stats band */}
      <section className="brand-bg text-white">
        <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
              <div className="font-head text-4xl sm:text-5xl font-extrabold gold-text">{s.value}</div>
              <div className="text-white/70 text-sm mt-2">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Steps */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="font-head text-3xl sm:text-4xl font-extrabold brand-text">ثلاث خطوات لموقعك</h2>
          <p className="text-slate-600 mt-3">من الفكرة إلى النشر بسلاسة تامة.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {STEPS.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="relative p-8 rounded-2xl bg-white border border-slate-200 soft-shadow">
              <span className="absolute -top-4 -start-4 w-10 h-10 rounded-xl brand-bg text-white grid place-items-center font-bold">{i + 1}</span>
              <s.icon className="w-10 h-10 brand-accent-text mb-4" />
              <h3 className="font-bold text-xl brand-text mb-2">{s.title}</h3>
              <p className="text-slate-600 leading-relaxed">{s.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="font-head text-3xl sm:text-4xl font-extrabold brand-text">كل ما تحتاجه في مكان واحد</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <div key={i} className="p-7 rounded-2xl bg-[#FAFAFA] border border-slate-200 transition-transform duration-200 hover:-translate-y-1">
                <span className="w-12 h-12 rounded-xl brand-bg text-white grid place-items-center mb-4"><f.icon className="w-6 h-6" /></span>
                <h3 className="font-bold text-lg brand-text mb-2">{f.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why us comparison */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-10">
          <h2 className="font-head text-3xl sm:text-4xl font-extrabold brand-text">لماذا منصتي؟</h2>
          <p className="text-slate-600 mt-3">مقارنة سريعة بين منصتي والطرق التقليدية لبناء المواقع.</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 soft-shadow overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-6 px-6 py-4 bg-slate-50 border-b border-slate-200 text-sm font-bold">
            <span className="text-slate-500">الميزة</span>
            <span className="brand-text text-center w-20">منصتي</span>
            <span className="text-slate-400 text-center w-24">طرق أخرى</span>
          </div>
          {COMPARE.map((c, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-6 px-6 py-4 border-b border-slate-100 last:border-0">
              <span className="text-slate-700">{c.f}</span>
              <span className="w-20 flex justify-center">{c.us ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <span className="text-slate-300">—</span>}</span>
              <span className="w-24 flex justify-center">{c.other ? <CheckCircle2 className="w-5 h-5 text-slate-300" /> : <span className="text-slate-300">—</span>}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Templates preview */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="font-head text-3xl sm:text-4xl font-extrabold brand-text">قوالب جاهزة للانطلاق</h2>
            <p className="text-slate-600 mt-2">اختر ما يناسب نشاطك وابدأ التحرير فورًا.</p>
          </div>
          <Link to="/templates" className="hidden sm:inline-flex items-center gap-1 brand-accent-text font-semibold">عرض الكل <ArrowLeft className="w-4 h-4" /></Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {templates.map((t) => (
            <Link to="/templates" key={t.id} className="group rounded-2xl overflow-hidden border border-slate-200 bg-white soft-shadow transition-transform duration-200 hover:-translate-y-2" data-testid={`home-template-${t.id}`}>
              <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                <img src={t.thumbnail} alt={t.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
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
      <section className="bg-[#FAFAFA] py-20 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="font-head text-3xl sm:text-4xl font-extrabold brand-text">باقات مرنة</h2>
            <p className="text-slate-600 mt-3">أسعار تجريبية قابلة للتعديل قبل الإطلاق الرسمي.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
            {plans.map((p) => (
              <div key={p.id} className={`rounded-2xl p-7 bg-white border ${p.highlight ? "border-[var(--brand-accent)] soft-shadow-lg" : "border-slate-200 soft-shadow"}`}>
                {p.highlight && <span className="inline-block mb-3 text-xs font-bold brand-accent-bg text-white rounded-full px-3 py-1">الأكثر شيوعًا</span>}
                <h3 className="font-head text-xl font-extrabold brand-text">{p.name}</h3>
                <div className="my-4"><span className="text-4xl font-extrabold brand-text">{p.price_monthly}</span><span className="text-slate-500"> {p.currency}/شهر</span></div>
                <ul className="space-y-2 mb-6">
                  {(p.features || []).slice(0, 5).map((f, i) => <li key={i} className="flex items-center gap-2 text-slate-600 text-sm"><CheckCircle2 className="w-4 h-4 text-green-500" /> {f}</li>)}
                </ul>
                <Link to="/pricing"><Button className={`w-full rounded-full ${p.highlight ? "brand-accent-bg text-white" : "brand-bg text-white"}`}>اختر الباقة</Button></Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 py-20">
        <h2 className="font-head text-3xl sm:text-4xl font-extrabold brand-text text-center mb-10">الأسئلة الشائعة</h2>
        <div className="space-y-3">
          {FAQS.map((f, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <button className="w-full flex items-center justify-between p-5 text-start font-bold brand-text" onClick={() => setFaqOpen(faqOpen === i ? -1 : i)} data-testid={`faq-${i}`}>
                {f.q}<ChevronDown className={`w-5 h-5 transition-transform duration-200 ${faqOpen === i ? "rotate-180" : ""}`} />
              </button>
              {faqOpen === i && <div className="px-5 pb-5 text-slate-600 leading-relaxed">{f.a}</div>}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="rounded-3xl brand-bg text-white p-12 text-center relative overflow-hidden">
          <div className="absolute -bottom-20 -end-20 w-80 h-80 rounded-full" style={{ background: "radial-gradient(circle, rgba(212,175,55,0.3), transparent 70%)" }} />
          <h2 className="font-head text-3xl sm:text-4xl font-extrabold mb-4 relative">جاهز لإطلاق موقعك؟</h2>
          <p className="text-white/80 mb-8 relative">أنشئ حسابك الآن وابدأ ببناء موقعك في دقائق.</p>
          <Link to="/register" className="relative"><Button className="bg-[var(--brand-secondary)] text-[#0A2540] rounded-full px-10 py-6 text-base font-bold" data-testid="cta-register-btn">إنشاء حساب مجاني</Button></Link>
        </div>
      </section>
    </div>
  );
}
