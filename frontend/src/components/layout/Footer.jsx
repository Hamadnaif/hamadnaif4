import { Link } from "react-router-dom";
import { useBrand } from "@/context/BrandContext";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";
import { ArrowLeft } from "lucide-react";

export default function Footer() {
  const { settings } = useBrand();
  return (
    <footer className="identity-dark text-white mt-12" data-testid="footer">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        <div className="py-12 sm:py-16 border-b border-white/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <p className="text-blue-200 text-sm mb-3">فكرتك تستحق أن تُرى</p>
            <h3 className="font-head text-2xl sm:text-4xl font-extrabold" data-testid="footer-cta-heading">خلّ الخطوة الأولى علينا.</h3>
          </div>
          <Button asChild className="brand-accent-bg text-white rounded-xl px-8 py-6 text-base font-bold identity-action"><Link to="/register" data-testid="footer-cta-btn">ابدأ موقعك مجانًا <ArrowLeft className="w-4 h-4" /></Link></Button>
        </div>
      </div>

      <div>
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-14 grid gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <Link to="/" className="inline-block mb-5" data-testid="footer-home"><BrandLogo light tagline testId="footer-brand-logo" /></Link>
            <p className="text-white/70 text-sm leading-relaxed">
              منصة عربية ذكية لإنشاء المواقع الإلكترونية وربط النطاقات، مصمّمة لأصحاب المشاريع في السعودية والخليج.
            </p>
          </div>

          {[
            { title: "المنصة", links: [["/templates", "القوالب"], ["/pricing", "الباقات"], ["/domains", "البحث عن نطاق"], ["/register", "إنشاء حساب"]] },
            { title: "الشركة", links: [["/about", "من نحن"], ["/contact", "تواصل معنا"]] },
            { title: "قانوني", links: [["/terms", "الشروط والأحكام"], ["/privacy", "سياسة الخصوصية"], ["/refund", "سياسة الاسترجاع"]] },
          ].map((group) => (
            <div key={group.title}>
              <h4 className="font-bold mb-4 text-blue-200">{group.title}</h4>
              <ul className="space-y-3 text-sm text-white/80">
                {group.links.map(([to, label]) => <li key={to}><Link to={to} data-testid={`footer-${to.slice(1)}`} className="hover:text-white transition-colors">{label}</Link></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-6 py-5 text-sm text-white/60 flex flex-col sm:flex-row justify-between gap-2">
            <span data-testid="footer-copyright">© {new Date().getFullYear()} {settings.platform_name}. جميع الحقوق محفوظة.</span>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2" dir="ltr">
              <a href={`mailto:${settings.contact_email}`} data-testid="footer-email" className="hover:text-white transition-colors">{settings.contact_email}</a>
              {settings.contact_phone && <a href={`tel:${settings.contact_phone.replace(/[^\d+]/g, "")}`} data-testid="footer-phone" className="hover:text-white transition-colors">{settings.contact_phone}</a>}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
