import { useBrand } from "@/context/BrandContext";
import { Target, Eye, Users } from "lucide-react";

export default function About() {
  const { settings } = useBrand();
  const about = settings.pages_content?.about;
  return (
    <div className="max-w-4xl mx-auto px-6 py-16" data-testid="about-page">
      <h1 className="font-head text-4xl sm:text-5xl font-extrabold brand-text mb-6 text-center">من نحن</h1>
      <p className="text-slate-700 text-lg leading-relaxed mb-12 text-center">{about}</p>
      <div className="grid gap-6 md:grid-cols-3">
        {[
          { icon: Target, title: "رسالتنا", text: "تمكين كل صاحب مشروع من امتلاك حضور رقمي احترافي بسهولة." },
          { icon: Eye, title: "رؤيتنا", text: "أن نكون الخيار العربي الموثوق لإنشاء المواقع وربط النطاقات." },
          { icon: Users, title: "جمهورنا", text: "الأفراد وأصحاب المشاريع الصغيرة في السعودية والخليج." },
        ].map((c, i) => (
          <div key={i} className="p-7 rounded-2xl bg-white border border-slate-200 soft-shadow text-center">
            <span className="w-14 h-14 rounded-2xl brand-bg text-white grid place-items-center mx-auto mb-4"><c.icon className="w-7 h-7" /></span>
            <h3 className="font-bold text-lg brand-text mb-2">{c.title}</h3>
            <p className="text-slate-600 text-sm leading-relaxed">{c.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
