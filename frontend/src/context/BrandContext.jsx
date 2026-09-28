import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, mediaUrl } from "@/lib/api";

const BrandContext = createContext(null);
export const useBrand = () => useContext(BrandContext);

const DEFAULTS = {
  platform_name: "منصتي",
  logo_url: "/brand/logo.webp",
  colors: { primary: "#071D32", secondary: "#2563EB", accent: "#2563EB" },
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
      // Only set a fallback title if a page (usePageMeta) hasn't claimed it.
      if (merged.platform_name && !window.__pageMetaSet) document.title = `${merged.platform_name} · فكرتك تبدأ بموقع`;
    } catch { /* keep defaults */ }
  }, [applyColors]);

  useEffect(() => { load(); }, [load]);

  return (
    <BrandContext.Provider value={{ settings, reloadBrand: load, logo: mediaUrl(settings.logo_url) }}>
      {children}
    </BrandContext.Provider>
  );
}
