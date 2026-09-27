import { Link } from "react-router-dom";
import { useBrand } from "@/context/BrandContext";
import { Sparkles } from "lucide-react";

export default function Footer() {
  const { settings } = useBrand();
  return (
    <footer className="brand-bg text-white mt-20" data-testid="footer">
      <div className="max-w-7xl mx-auto px-6 py-14 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-9 h-9 rounded-xl bg-white/10 grid place-items-center">
              <Sparkles className="w-5 h-5 gold-text" />
            </span>
            <span className="font-head font-extrabold text-xl">{settings.platform_name}</span>
          </div>
          <p className="text-white/70 text-sm leading-relaxed">
            منصة عربية لإنشاء المواقع الإلكترونية وربط النطاقات، مصمّمة لأصحاب المشاريع في السعودية والخليج.
          </p>
        </div>

        <div>
          <h4 className="font-bold mb-4 gold-text">المنصة</h4>
          <ul className="space-y-2 text-sm text-white/80">
            <li><Link to="/templates" className="hover:text-white">القوالب</Link></li>
            <li><Link to="/pricing" className="hover:text-white">الباقات</Link></li>
            <li><Link to="/domains" className="hover:text-white">البحث عن نطاق</Link></li>
            <li><Link to="/register" className="hover:text-white">إنشاء حساب</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold mb-4 gold-text">الشركة</h4>
          <ul className="space-y-2 text-sm text-white/80">
            <li><Link to="/about" className="hover:text-white">من نحن</Link></li>
            <li><Link to="/contact" className="hover:text-white">تواصل معنا</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold mb-4 gold-text">قانوني</h4>
          <ul className="space-y-2 text-sm text-white/80">
            <li><Link to="/terms" className="hover:text-white">الشروط والأحكام</Link></li>
            <li><Link to="/privacy" className="hover:text-white">سياسة الخصوصية</Link></li>
            <li><Link to="/refund" className="hover:text-white">سياسة الاسترجاع</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-5 text-sm text-white/60 flex flex-col sm:flex-row justify-between gap-2">
          <span>© {new Date().getFullYear()} {settings.platform_name}. جميع الحقوق محفوظة.</span>
          <span>{settings.contact_email}</span>
        </div>
      </div>
    </footer>
  );
}
