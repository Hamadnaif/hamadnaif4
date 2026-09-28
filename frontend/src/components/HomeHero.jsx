import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Check, LayoutTemplate, MousePointer2, Palette, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const HomeHero = () => {
  const reducedMotion = useReducedMotion();
  return (
    <section className="identity-hero" data-testid="brand-hero">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-20 items-center py-14 sm:py-20 lg:py-24">
        <motion.div initial={reducedMotion ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span className="inline-flex items-center gap-2 text-sm font-bold brand-accent-text mb-7" data-testid="hero-eyebrow"><span className="w-7 h-px brand-accent-bg" /> من فكرة تستحق… إلى موقع يليق بها</span>
          <h1 className="font-head text-4xl sm:text-5xl lg:text-6xl font-extrabold brand-text leading-[1.35] tracking-tight mb-6" data-testid="hero-title">فكرتك تبدأ<br /><span className="brand-accent-text relative inline-block">بموقع<span className="hero-underline" aria-hidden="true" /></span></h1>
          <p className="text-base sm:text-lg text-slate-600 max-w-lg leading-[1.95] mb-8" data-testid="hero-description">مساحة لفكرتك، وواجهة تشبهك. أنشئ موقعك بالعربية، خصّص كل تفصيلة، وشارك مشروعك مع العالم. دون كتابة سطر برمجي.</p>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="brand-accent-bg text-white rounded-xl h-13 px-7 py-6 text-base font-bold identity-action"><Link to="/register" data-testid="hero-start-btn">ابدأ موقعك مجانًا <ArrowLeft className="w-5 h-5" /></Link></Button>
            <Button asChild variant="outline" className="bg-white rounded-xl px-6 py-6 text-base brand-text border-slate-200 hover:bg-blue-50 hover:text-blue-700"><Link to="/templates" data-testid="hero-templates-btn"><LayoutTemplate /> استكشف القوالب</Link></Button>
          </div>
          <div className="flex flex-wrap gap-5 mt-6 text-sm text-slate-500" data-testid="hero-free-note">
            <span className="inline-flex items-center gap-1.5"><Check className="w-4 h-4 brand-accent-text" /> بداية مجانية</span>
            <span className="inline-flex items-center gap-1.5"><Check className="w-4 h-4 brand-accent-text" /> بدون بطاقة بنكية</span>
          </div>
        </motion.div>
        <motion.figure className="hero-studio" initial={reducedMotion ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.15 }} data-testid="hero-illustration">
          <div className="studio-topline"><span className="flex items-center gap-2"><img src="/brand/mark.webp" alt="" className="w-6 h-6 object-contain" /> مساحة إبداعك</span><span className="studio-dots" aria-hidden="true"><i /><i /><i /></span></div>
          <img src="/brand/builder-illustration.webp" alt="تصميم توضيحي لأدوات إنشاء الموقع من الهوية الجديدة لمنصتي" width="417" height="357" className="studio-art" fetchPriority="high" />
          <span className="studio-tag studio-tag-top" aria-hidden="true"><Palette className="w-4 h-4 brand-accent-text" /> هويتك، بكل تفاصيلها</span>
          <span className="studio-tag studio-tag-bottom" aria-hidden="true"><Sparkles className="w-4 h-4 brand-accent-text" /> فكرتك + أدوات ذكية</span>
          <div className="studio-cursor" aria-hidden="true"><MousePointer2 className="w-7 h-7 fill-current" /><span>أنت المبدع</span></div>
          <figcaption className="studio-caption" data-testid="hero-illustration-caption">تصوّر توضيحي • أنت تختار كيف يبدو موقعك</figcaption>
        </motion.figure>
      </div>
      <div className="border-y border-slate-200/80 bg-white/60">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-5 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm" data-testid="hero-audiences">
          <span className="font-bold brand-text">لكل فكرة مساحة.</span>
          {["أصحاب المشاريع", "المستقلون", "المتاجر", "المطاعم والمقاهي", "معارض الأعمال"].map((item) => <span key={item} className="text-slate-500">{item}</span>)}
        </div>
      </div>
    </section>
  );
};
