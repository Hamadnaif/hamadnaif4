import { useState } from "react";
import { api, apiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [pw, setPw] = useState({ current_password: "", new_password: "" });
  const [savingName, setSavingName] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const saveName = async (e) => {
    e.preventDefault();
    setSavingName(true);
    try { await api.put("/auth/profile", { name }); await refreshUser(); toast.success("تم تحديث البيانات"); }
    catch (err) { toast.error(apiError(err.response?.data?.detail)); }
    setSavingName(false);
  };

  const changePw = async (e) => {
    e.preventDefault();
    setSavingPw(true);
    try { await api.put("/auth/change-password", pw); toast.success("تم تغيير كلمة المرور"); setPw({ current_password: "", new_password: "" }); }
    catch (err) { toast.error(apiError(err.response?.data?.detail)); }
    setSavingPw(false);
  };

  return (
    <div className="max-w-2xl space-y-8" data-testid="profile-page">
      <div>
        <h2 className="font-head text-xl font-extrabold brand-text mb-4">بياناتي</h2>
        <form onSubmit={saveName} className="bg-white rounded-2xl border border-slate-200 soft-shadow p-6 space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-600 mb-1 block">الاسم</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[var(--brand-accent)]" data-testid="profile-name" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-600 mb-1 block">البريد الإلكتروني</label>
            <input value={user?.email || ""} disabled className="w-full rounded-xl border border-slate-200 px-4 py-3 bg-slate-50 text-slate-400" dir="ltr" />
          </div>
          <Button type="submit" disabled={savingName} className="brand-bg text-white rounded-full" data-testid="profile-save">{savingName ? "جارٍ الحفظ..." : "حفظ"}</Button>
        </form>
      </div>

      {user?.auth_provider !== "google" && (
        <div>
          <h2 className="font-head text-xl font-extrabold brand-text mb-4">تغيير كلمة المرور</h2>
          <form onSubmit={changePw} className="bg-white rounded-2xl border border-slate-200 soft-shadow p-6 space-y-4">
            <input required type="password" placeholder="كلمة المرور الحالية" value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[var(--brand-accent)]" data-testid="profile-current-pw" />
            <input required type="password" placeholder="كلمة المرور الجديدة" value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[var(--brand-accent)]" data-testid="profile-new-pw" />
            <Button type="submit" disabled={savingPw} className="brand-bg text-white rounded-full" data-testid="profile-change-pw">{savingPw ? "جارٍ..." : "تغيير كلمة المرور"}</Button>
          </form>
        </div>
      )}
    </div>
  );
}
