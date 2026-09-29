import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, apiError, BACKEND_URL } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Eye, Rocket, PowerOff, Trash2, Loader2, ExternalLink, Wand2 } from "lucide-react";

const STATUS = {
  draft: { label: "مسودة", cls: "bg-slate-100 text-slate-600" },
  published: { label: "منشور", cls: "bg-green-100 text-green-700" },
  suspended: { label: "موقوف", cls: "bg-red-100 text-red-700" },
};

export default function Sites() {
  const navigate = useNavigate();
  const [sites, setSites] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [creating, setCreating] = useState(false);
  const [newSite, setNewSite] = useState({ name: "", template_id: "" });
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const createWithAI = async () => {
    if (!aiPrompt.trim()) { toast.error("صف نشاطك أولًا"); return; }
    setAiLoading(true);
    try {
      const gen = await api.post("/ai/generate-template", { prompt: aiPrompt });
      const { data } = await api.post("/sites/from-ai", { name: gen.data.name, config: gen.data.config });
      toast.success("تم إنشاء الموقع بالذكاء الاصطناعي");
      setCreating(false); setAiPrompt("");
      navigate(`/editor/${data.id}`);
    } catch (err) { toast.error(apiError(err.response?.data?.detail)); }
    setAiLoading(false);
  };

  const load = async () => {
    try { const { data } = await api.get("/sites"); setSites(data); } catch { setSites([]); }
  };
  useEffect(() => {
    load();
    api.get("/public/templates").then((r) => setTemplates(r.data)).catch(() => {});
  }, []);

  const create = async () => {
    if (!newSite.name || !newSite.template_id) { toast.error("أدخل اسم الموقع واختر قالبًا"); return; }
    setSaving(true);
    try {
      const { data } = await api.post("/sites", newSite);
      toast.success("تم إنشاء الموقع");
      setCreating(false);
      setNewSite({ name: "", template_id: "" });
      navigate(`/editor/${data.id}`);
    } catch (err) { toast.error(apiError(err.response?.data?.detail)); }
    setSaving(false);
  };

  const togglePublish = async (site) => {
    try {
      await api.post(`/sites/${site.id}/${site.status === "published" ? "unpublish" : "publish"}`);
      toast.success(site.status === "published" ? "تم إلغاء النشر" : "تم نشر الموقع");
      load();
    } catch (err) { toast.error(apiError(err.response?.data?.detail)); }
  };

  const remove = async () => {
    try { await api.delete(`/sites/${toDelete.id}`); toast.success("تم حذف الموقع"); setToDelete(null); load(); }
    catch (err) { toast.error(apiError(err.response?.data?.detail)); }
  };

  if (sites === null) return <div className="grid place-items-center py-20"><Loader2 className="w-8 h-8 animate-spin brand-accent-text" /></div>;

  return (
    <div data-testid="sites-page">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-head text-xl font-extrabold brand-text">مواقعي ({sites.length})</h2>
        <div className="flex gap-2">
          <Button onClick={() => navigate("/dashboard/start")} className="brand-accent-bg text-white rounded-full" data-testid="start-wizard-btn"><Wand2 className="w-4 h-4 ms-1" /> المعالج الذكي</Button>
          <Button onClick={() => setCreating(true)} variant="outline" className="rounded-full" data-testid="create-site-btn"><Plus className="w-4 h-4 ms-1" /> موقع جديد</Button>
        </div>
      </div>

      {sites.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300" data-testid="sites-empty">
          <span className="w-16 h-16 rounded-2xl brand-gradient text-white grid place-items-center mx-auto mb-4"><Wand2 className="w-8 h-8" /></span>
          <h3 className="font-head text-2xl font-extrabold brand-text mb-2">ابدأ بموقعك الأول</h3>
          <p className="text-slate-600 mb-6 max-w-md mx-auto">صِف نشاطك ودَع المعالج الذكي يبني لك موقعًا كاملًا خلال ثوانٍ، أو ابدأ من قالب جاهز.</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => navigate("/dashboard/start")} className="brand-accent-bg text-white rounded-full px-6" data-testid="empty-wizard-btn"><Wand2 className="w-4 h-4 ms-1" /> المعالج الذكي</Button>
            <Button onClick={() => setCreating(true)} variant="outline" className="rounded-full px-6"><Plus className="w-4 h-4 ms-1" /> من قالب</Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sites.map((s) => {
            const st = STATUS[s.status] || STATUS.draft;
            return (
              <div key={s.id} className="bg-white rounded-2xl border border-slate-200 soft-shadow overflow-hidden" data-testid={`site-card-${s.id}`}>
                <div className="p-5 border-b border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-lg brand-text truncate">{s.name}</h3>
                    <span className={`text-xs font-bold rounded-full px-2.5 py-1 ${st.cls}`} data-testid={`site-status-${s.id}`}>{st.label}</span>
                  </div>
                  <p className="text-slate-400 text-sm truncate" dir="ltr">{s.subdomain}.منصتي</p>
                  {s.custom_domain && <p className="text-xs mt-1 gold-text" dir="ltr">{s.custom_domain}</p>}
                </div>
                <div className="p-3 grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => navigate(`/editor/${s.id}`)} className="rounded-xl" data-testid={`site-edit-${s.id}`}><Pencil className="w-4 h-4 ms-1" /> تعديل</Button>
                  <Button variant="outline" onClick={() => window.open(`/s/${s.subdomain}?preview=${s.id}`, "_blank", "noopener")} className="rounded-xl" data-testid={`site-preview-${s.id}`}><Eye className="w-4 h-4 ms-1" /> معاينة</Button>
                  <Button onClick={() => togglePublish(s)} className={`rounded-xl ${s.status === "published" ? "bg-amber-500 hover:bg-amber-600" : "brand-bg"} text-white`} data-testid={`site-publish-${s.id}`}>
                    {s.status === "published" ? <><PowerOff className="w-4 h-4 ms-1" /> إلغاء النشر</> : <><Rocket className="w-4 h-4 ms-1" /> نشر</>}
                  </Button>
                  <Button variant="ghost" onClick={() => setToDelete(s)} className="rounded-xl text-red-600 hover:bg-red-50" data-testid={`site-delete-${s.id}`}><Trash2 className="w-4 h-4 ms-1" /> حذف</Button>
                </div>
                {s.status === "published" && (
                  <a href={`/s/${s.subdomain}`} target="_blank" rel="noreferrer" className="block text-center text-xs brand-accent-text py-2 border-t border-slate-100 hover:bg-slate-50"><ExternalLink className="w-3 h-3 inline ms-1" /> فتح الموقع المنشور</a>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-head text-2xl brand-text text-start">إنشاء موقع جديد</DialogTitle></DialogHeader>
          <div className="rounded-xl border-2 border-[var(--brand-accent)] bg-blue-50/50 p-4 mb-2">
            <label className="text-sm font-bold brand-text mb-1 block">✨ أنشئ موقعًا بالذكاء الاصطناعي</label>
            <p className="text-xs text-slate-500 mb-2">صِف نشاطك وسننشئ لك موقعًا كاملًا بالمحتوى العربي فورًا.</p>
            <div className="flex gap-2">
              <input value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="مثال: مقهى مختص بالقهوة في الرياض" className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--brand-accent)]" data-testid="ai-template-prompt" />
              <Button onClick={createWithAI} disabled={aiLoading} className="brand-accent-bg text-white rounded-xl" data-testid="ai-template-generate">
                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "توليد"}
              </Button>
            </div>
          </div>
          <div className="text-center text-xs text-slate-400 my-1">أو اختر قالبًا جاهزًا</div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-600 mb-1 block">اسم الموقع</label>
              <input value={newSite.name} onChange={(e) => setNewSite({ ...newSite, name: e.target.value })} placeholder="مثال: متجر الورد" className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[var(--brand-accent)]" data-testid="new-site-name" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-600 mb-2 block">اختر قالبًا</label>
              <div className="grid grid-cols-2 gap-3 max-h-72 overflow-y-auto">
                {templates.map((t) => (
                  <button key={t.id} onClick={() => setNewSite({ ...newSite, template_id: t.id })} data-testid={`new-site-template-${t.id}`}
                    className={`text-start rounded-xl border-2 overflow-hidden transition-colors ${newSite.template_id === t.id ? "border-[var(--brand-accent)]" : "border-slate-200"}`}>
                    <img src={t.thumbnail} alt={t.name} className="w-full h-24 object-cover" />
                    <div className="p-2"><span className="text-xs gold-text">{t.category}</span><div className="font-bold text-sm brand-text">{t.name}</div></div>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={create} disabled={saving} className="brand-bg text-white rounded-full w-full py-6" data-testid="new-site-submit">
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "إنشاء والانتقال للمحرّر"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={() => setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-start">حذف الموقع</AlertDialogTitle>
            <AlertDialogDescription className="text-start">سيتم حذف «{toDelete?.name}» نهائيًا مع كل محتواه. لا يمكن التراجع.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-red-600 hover:bg-red-700" data-testid="confirm-delete-site">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
