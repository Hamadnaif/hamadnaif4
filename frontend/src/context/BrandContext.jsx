import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, mediaUrl } from "@/lib/api";

const BrandContext = createContext(null);
export const useBrand = () => useContext(BrandContext);

const DEFAULTS = {
  platform_name: "منصتي",
  logo_url: null,
  colors: { primary: "#0A2540", secondary: "#D4AF37", accent: "#2563EB" },
};

export function BrandProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULTS);

  const applyColors = useCallback((colors) => {
    if (!colors) return;
    const root = document.documentElement;
    if (colors.primary) root.style.setProperty("--brand-primary", colors.primary);
    if (colors.secondary) root.style.setProperty("--brand-secondary", colors.secondary);
    if (colors.accent) root.style.setProperty("--brand-accent", colors.accent);
  }, []);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/public/settings");
      const merged = { ...DEFAULTS, ...data };
      setSettings(merged);
      applyColors(merged.colors);
      if (merged.platform_name) document.title = `${merged.platform_name} · أنشئ موقعك الإلكتروني`;
    } catch { /* keep defaults */ }
  }, [applyColors]);

  useEffect(() => { load(); }, [load]);

  return (
    <BrandContext.Provider value={{ settings, reloadBrand: load, logo: mediaUrl(settings.logo_url) }}>
      {children}
    </BrandContext.Provider>
  );
}
