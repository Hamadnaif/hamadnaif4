import { useBrand } from "@/context/BrandContext";

export const BrandLogo = ({ light = false, tagline = false, className = "", testId }) => {
  const { settings, logo } = useBrand();
  const isDefault = !settings.logo_url || settings.logo_url === "/brand/logo.webp";
  const source = isDefault ? `/brand/${light ? "logo-light" : "logo"}.webp` : logo;

  return (
    <span className={`brand-lockup ${className}`} data-testid={testId}>
      <img src={source} alt={settings.platform_name} width="1725" height="560"
        className={`brand-logo-image ${light && !isDefault ? "brand-custom-on-dark" : ""}`} />
      {tagline && <span className={light ? "text-blue-200" : "brand-accent-text"}>فكرتك تبدأ بموقع</span>}
    </span>
  );
};
