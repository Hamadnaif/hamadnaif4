import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center bg-[#FAFAFA] px-6" data-testid="not-found">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-2xl brand-bg text-white grid place-items-center mx-auto mb-6">
          <Compass className="w-10 h-10" />
        </div>
        <h1 className="font-head text-6xl font-extrabold brand-text mb-2">404</h1>
        <p className="text-slate-600 mb-8">الصفحة التي تبحث عنها غير موجودة أو تم نقلها.</p>
        <Link to="/">
          <Button className="brand-bg text-white rounded-full px-8" data-testid="notfound-home-btn">العودة للرئيسية</Button>
        </Link>
      </div>
    </div>
  );
}
