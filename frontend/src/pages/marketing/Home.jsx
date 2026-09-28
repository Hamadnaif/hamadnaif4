import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, LayoutTemplate, MousePointerClick, Rocket, Globe,
  Palette, ShieldCheck, Smartphone, Search, CheckCircle2, ChevronDown, Sparkles, Wand2,
} from "lucide-react";

const PARTNERS = ["مدى", "Apple Pay", "Visa", "Mastercard", "Moyasar", "STC Pay", "ResellerClub"];
const STATS = [
  { value: "30+", label: "قالب جاهز" },
  { value: "16", label: "نوع قسم قابل للتخصيص" },
  { value: "0%", label: "عمولة على مبيعاتك" },
  { value: "RTL", label: "دعم عربي كامل" },
];
const COMPARE = [
  { f: "إطلاق موقع خلال دقائق", us: true, other: false },
  { f: "توليد موقع كامل بالذكاء الاصطناعي من وصف واحد", us: true, other: false },
  { f: "تحكم كامل بالهوية والألوان والخط", us: true, other: false },
  { f: "معاينة حيّة للقالب قبل الاختيار", us: true, other: false },
  { f: "نطاق فرعي مجاني + ربط نطاقك الخاص", us: true, other: true },
  { f: "بدون خبرة برمجية", us: true, other: false },
];
const STEPS = [
  { icon: Wand2, title: "صِف نشاطك", text: "اكتب جملة عن نشاطك، أو اختر قالبًا جاهزًا يناسبك." },
  { icon: MousePointerClick, title: "خصّص بسهولة", text: "عدّل النصوص والصور والألوان من محرّر عربي بسيط." },
  { icon: Rocket, title: "انشر فورًا", text: "انشر على رابط فرعي مجاني أو اربط نطاقك الخاص." },
];
const FEATURES = [
  { icon: Wand2, title: "منشئ ذكي بالكامل", text: "صِف نشاطك وسننشئ لك موقعًا كاملًا بالمحتوى والصور العربية." },
  { icon: Palette, title: "تحكّم كامل بالهوية", text: "غيّر الألوان والخطوط والشعار ليعبّر عن علامتك." },
  { icon: Smartphone, title: "متجاوب على الجوال", text: "مواقعك تظهر باحترافية على جميع الأجهزة." },
  { icon: Globe, title: "نطاق خاص", text: "اربط نطاقك أو احصل على نطاق فرعي مجاني." },
  { icon: Search, title: "جاهز لمحركات البحث", text: "بنية سريعة قابلة للفهرسة مع إعدادات SEO." },
  { icon: ShieldCheck, title: "أمان وعزل بيانات", text: "بياناتك ومواقعك معزولة وآمنة تمامًا." },
];
const FAQS = [
  { q: "هل أحتاج خبرة تقنية؟", a: "لا، المحرر يعتمد على أقسام جاهزة تضيفها وترتّبها بسهولة، ويمكنك توليد موقع كامل بالذكاء الاصطناعي من وصف واحد." },
  { q: "هل يمكنني ربط نطاقي الخاص؟", a: "نعم، تدعم المنصة ربط نطاق تملكه مع إرشادات سجلات DNS، بالإضافة إلى نطاق فرعي مجاني." },
  { q: "كيف يتم الدفع؟", a: "سندعم بوابة دفع تناسب السوق السعودي. حاليًا الأسعار تجريبية وقابلة للتعديل قبل الإطلاق." },
  { q: "ماذا يحدث عند انتهاء الاشتراك؟", a: "لا نحذف محتواك تلقائيًا؛ يُعرض حال الحساب وفق سياسة واضحة يمكن مراجعتها." },
];

function BuilderMockup() {
  return (
    <div className="relative">
      <div className="orb w-72 h-72 -top-10 -end-10 pulse-ring" style={{ background: "var(--brand-secondary)", opacity: 0.4 }} />
      <div className="orb w-64 h-64 -bottom-10 -start-10" style={{ background: "var(--brand-accent)", opacity: 0.35 }} />
      <motion.div
        initial={{ opacity: 0, y: 30, rotateX: 8 }} animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.7, delay: 0.15 }}
        className="relative rounded-2xl overflow-hidden premium-ring bg-white floaty"
      >
        <div className="flex items-center gap-1.5 px-4 h-9 bg-slate-100">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
          <span className="mx-auto text-[11px] text-slate-400" dir="ltr">manasati.sa</span>
        </div>
        <div className="p-5">
          <div className="rounded-xl brand-gradient text-white p-5 mb-4">
            <div className="h-2.5 w-24 bg-white/40 rounded-full mb-2" />
            <div className="h-4 w-40 bg-white/80 rounded-full mb-3" />
            <div className="inline-flex h-7 w-24 rounded-full" style={{ background: "var(--brand-secondary)" }} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-xl border border-slate-100 p-3 bg-slate-50">
                <div className="w-8 h-8 rounded-lg brand-accent-bg mb-2 opacity-80" />
                <div className="h-2 w-full bg-slate-200 rounded-full mb-1.5" />
                <div className="h-2 w-2/3 bg-slate-200 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.5 }}
        className="absolute -bottom-5 -start-5 bg-white rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3 border border-slate-100"
      >
        <span className="w-9 h-9 rounded-full brand-accent-bg text-white grid place-items-center"><Wand2 className="w-5 h-5" /></span>
        <div>
          <div className="text-xs text-slate-400">تم بالذكاء الاصطناعي</div>
          <div className="text-sm font-bold brand-text">موقع جاهز خلال ثوانٍ</div>
        </div>
      </motion.div>
    </div>
  );
}

export default function Home() {
  const [templates, setTemplates] = useState([]);
  const [plans, setPlans] = useState([]);
  const [faqOpen, setFaqOpen] = useState(0);

  useEffect(() => {
    api.get("/public/templates").then((r) => setTemplates(r.data.slice(0, 8))).catch(() => {});
    api.get("/public/plans").then((r) => setPlans(r.data)).catch(() => {});
  }, []);

  return (
    <div data-testid="home-page">
      {/* Hero */}
      <section className="relative overflow-hidden brand-gradient text-white">
        <div className="absolute inset-0 dotted-grid opacity-40" />
        <div className="orb w-[32rem] h-[32rem] -top-40 -start-40" style={{ background: "var(--brand-secondary)", opacity: 0.28 }} />
        <div className="relative max-w-7xl mx-auto px-6 py-20 lg:py-28 grid lg:grid-cols-2 gap-14 items-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-4 py-1.5 text-sm mb-6">
              <Sparkles className="w-4 h-4 gold-text" /> منصة عربية ذكية لإنشاء المواقع
            </span>
            <h1 className="font-head text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.15] mb-6">
              موقعك الاحترافي يبدأ <span className="gradient-gold">بجملة واحدة</span>
            </h1>
            <p className="text-lg text-white/85 max-w-xl mb-8 leading-relaxed">
              صِف نشاطك وسننشئ لك موقعًا عربيًا متكاملًا بالمحتوى والصور، أو اختر من عشرات القوالب الجاهزة — ثم انشره على نطاق فرعي فوري أو نطاقك الخاص. بلا أي خبرة تقنية.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/register"><Button className="bg-[var(--brand-secondary)] text-[#0A2540] hover:opacity-90 rounded-full px-8 py-6 text-base font-bold hover:-translate-y-0.5 transition-transform" data-testid="hero-start-btn"><Wand2 className="w-5 h-5 ms-1" /> أنشئ موقعي بالذكاء</Button></Link>
              <Link to="/templates"><Button variant="outline" className="rounded-full px-8 py-6 text-base bg-transparent border-white/30 text-white hover:bg-white/10" data-testid="hero-templates-btn">تصفّح القوالب</Button></Link>
            </div>
            <div className="flex items-center gap-6 mt-8 text-white/70 text-sm">
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 gold-text" /> ابدأ مجانًا</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 gold-text" /> بدون بطاقة</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 gold-text" /> عربي بالكامل</span>
            </div>
          </motion.div>
          <div className="hidden lg:block"><BuilderMockup /></div>
        </div>
      </section>

      {/* Trust / integrations strip */}
      <section className="border-b border-slate-200 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <p className="text-center text-slate-400 text-sm mb-5">تكاملات دفع ونطاقات جاهزة تناسب السوق السعودي والخليجي</p>
          <div className="relative overflow-hidden no-scrollbar" style={{ maskImage: "linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)" }}>
            <div className="marquee-track gap-12">
              {[...PARTNERS, ...PARTNERS].map((p, i) => (
                <span key={i} className="text-slate-500 font-bold text-lg whitespace-nowrap opacity-70">{p}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats band */}
      <section className="brand-gradient text-white">
        <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
              <div className="font-head text-4xl sm:text-5xl font-extrabold gradient-gold">{s.value}</div>
              <div className="text-white/70 text-sm mt-2">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Steps */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <span className="uppercase text-xs tracking-[0.2em] font-bold text-slate-400">أبسط طريقة</span>
          <h2 className="font-head text-3xl sm:text-4xl font-extrabold brand-text mt-2">ثلاث خطوات لموقعك</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {STEPS.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="relative p-8 rounded-2xl bg-white border border-slate-200 hover-lift">
              <span className="absolute -top-4 -start-4 w-10 h-10 rounded-xl brand-gradient text-white grid place-items-center font-bold shadow-lg">{i + 1}</span>
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
              <motion.div key={i} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (i % 3) * 0.08 }}
                className="p-7 rounded-2xl bg-[#F8F9FB] border border-slate-200 hover-lift">
                <span className="w-12 h-12 rounded-xl brand-gradient text-white grid place-items-center mb-4"><f.icon className="w-6 h-6" /></span>
                <h3 className="font-bold text-lg brand-text mb-2">{f.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{f.text}</p>
              </motion.div>
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
            <p className="text-slate-600 mt-2">اختر ما يناسب نشاطك وعايِنه حيًّا قبل التحرير.</p>
          </div>
          <Link to="/templates" className="hidden sm:inline-flex items-center gap-1 brand-accent-text font-semibold hover:gap-2 transition-all">عرض الكل <ArrowLeft className="w-4 h-4" /></Link>
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
            <h2 className="font-head text-3xl sm:text-4xl font-extrabold brand-text">باقات مرنة</h2>
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
        <div className="rounded-3xl brand-gradient text-white p-12 sm:p-16 text-center relative overflow-hidden">
          <div className="absolute inset-0 dotted-grid opacity-30" />
          <div className="orb w-80 h-80 -bottom-24 -end-24" style={{ background: "var(--brand-secondary)", opacity: 0.35 }} />
          <h2 className="font-head text-3xl sm:text-5xl font-extrabold mb-4 relative">أطلق منصتك الآن</h2>
          <p className="text-white/80 mb-8 relative max-w-lg mx-auto">أنشئ حسابك مجانًا وابدأ ببناء موقعك خلال دقائق — أو دع الذكاء الاصطناعي يبنيه لك.</p>
          <Link to="/register" className="relative"><Button className="bg-[var(--brand-secondary)] text-[#0A2540] rounded-full px-10 py-6 text-base font-bold hover:-translate-y-0.5 transition-transform" data-testid="cta-register-btn">إنشاء حساب مجاني <ArrowLeft className="w-4 h-4 ms-1" /></Button></Link>
        </div>
      </section>
    </div>
  );
}
