// Scopes brand CSS variables so each template/site renders in its own palette
// instead of inheriting the platform-wide brand colors.
export function TemplateTheme({ colors, font, className = "", style = {}, children }) {
  const c = colors || {};
  const vars = {
    "--brand-primary": c.primary || "#0A2540",
    "--brand-secondary": c.secondary || "#D4AF37",
    "--brand-accent": c.accent || "#2563EB",
    fontFamily: font ? `"${font}", "IBM Plex Sans Arabic", sans-serif` : undefined,
    ...style,
  };
  return (
    <div className={className} style={vars}>
      {children}
    </div>
  );
}

export default TemplateTheme;
