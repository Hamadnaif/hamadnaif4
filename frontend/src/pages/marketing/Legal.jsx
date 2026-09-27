import { useBrand } from "@/context/BrandContext";

const TITLES = {
  terms: "الشروط والأحكام",
  privacy: "سياسة الخصوصية",
  refund: "سياسة الاسترجاع",
};

export default function Legal({ kind }) {
  const { settings } = useBrand();
  const content = settings.pages_content?.[kind];
  return (
    <div className="max-w-3xl mx-auto px-6 py-16" data-testid={`legal-${kind}`}>
      <h1 className="font-head text-4xl font-extrabold brand-text mb-6">{TITLES[kind]}</h1>
      <div className="prose prose-slate max-w-none">
        <p className="text-slate-700 text-lg leading-loose whitespace-pre-line">{content}</p>
      </div>
      <p className="text-slate-400 text-sm mt-10">آخر تحديث: {new Date().toLocaleDateString("ar-SA")}</p>
    </div>
  );
}
