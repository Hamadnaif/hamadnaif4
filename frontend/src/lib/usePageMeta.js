import { useEffect } from "react";

// Sets a per-page <title> and meta description so pages are not all identical for SEO.
export function usePageMeta(title, description, { noindex = false } = {}) {
  useEffect(() => {
    const brand = "منصتي";
    if (title) document.title = `${title} · ${brand}`;

    const setMeta = (name, content, attr = "name") => {
      if (!content) return;
      let el = document.head.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    if (description) {
      setMeta("description", description);
      setMeta("og:title", title ? `${title} · ${brand}` : brand, "property");
      setMeta("og:description", description, "property");
    }
    setMeta("robots", noindex ? "noindex, nofollow" : "index, follow");
  }, [title, description, noindex]);
}

export default usePageMeta;
