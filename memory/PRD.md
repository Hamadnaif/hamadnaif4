# PRD — منصتي (Manasati)

## Original Problem Statement
Arabic RTL SaaS platform to build websites and sell domains, similar in concept to website builders, targeting individuals and small businesses in Saudi Arabia and the Gulf. Temporary name «منصتي». Name/logo/colors configurable from admin. Arabic-first, full RTL, excellent mobile UX, structured to add English later. Customers register, pick a template, build & edit their site, preview, publish on a platform subdomain or connect their own domain, and search/buy domains (real purchase gated behind a real provider). Real product with DB, roles, dashboards — not mock pages.

## User Choices
- Auth: BOTH JWT email/password AND Emergent-managed Google login.
- Email: messages shown in dashboard now; Resend deferred.
- Payment: Moyasar (deferred — disabled until merchant keys).
- Domain reseller: ResellerClub default (deferred — disabled until account/API keys).
- Phase 1 first: full journey (create → edit → publish → admin), then subscriptions/payments/domains.

## Architecture
- Frontend: React 19 + React Router 7 + Tailwind + shadcn/ui + framer-motion, full RTL (dir=rtl), fonts Tajawal/Cairo. Contexts: AuthContext, BrandContext (applies configurable brand colors via CSS vars).
- Backend: FastAPI + Motor (MongoDB). Routers: auth, sites, media, public, admin, account, ai. All routes under /api.
- Auth: JWT httpOnly cookies (access/refresh) + Emergent Google session_token; roles customer/admin; bcrypt; brute-force lockout; admin seeded from env (never auto-granted).
- Media: images stored base64 in Mongo, served via /api/media/{id} (max 5MB, type-validated).
- AI: Emergent universal LLM key (OpenAI gpt-5.4-mini + Gemini 3.1 Pro) for Arabic content generation in editor.

## User Personas
- Customer: small business owner/individual building & publishing a site.
- Admin (platform owner): manages customers, templates, plans, settings, contacts, audit.

## Core Requirements (static)
Marketing site; auth (login/register/reset); customer dashboard (sites+status, domains, subscription, invoices); section-based editor (add/reorder/edit sections, pages, brand, SEO, media, mobile/desktop preview, draft/publish); subdomain publishing + custom domain flow; domain search (provider-gated); 3 configurable plans; payment (gated); admin dashboard with RBAC + audit; security (data isolation, input validation, upload protection, rate limiting on login).

## Implemented (2026-06)
- [x] SMART ONBOARDING WIZARD (/dashboard/start, StartWizard.jsx): 4-step guided flow — describe business → AI generates full Arabic site (POST /ai/generate-template) → live preview (SectionRenderer + template colors) with regenerate → auto domain suggestions (POST /ai/suggest-domains + availability via /public/domain/search) with free-subdomain default → create (POST /sites/from-ai) → editor. Entry points: header + empty-state buttons on Sites. Verified E2E (testing agent iteration_6, backend curl): generate→preview→domains→finish works; free-plan lifetime cap enforced at finish with clear inline error + upgrade link.
- [x] Premium redesign ("Oasis & Obsidian"): new design system (IBM Plex Sans Arabic, brand-gradient, marquee, orbs, hover-lift), redesigned Home hero (CSS builder mockup) + integrations marquee + stats; premium Navbar/Footer (big CTA band).
- [x] Templates: LIVE full-page preview (renders real SectionRenderer sections in a browser frame with desktop/mobile toggle) using per-template palettes via TemplateTheme (scopes --brand-* CSS vars); SectionRenderer hero/testimonials/cta now reflect each template's own colors (no more hardcoded navy). Reduced template variants to (الحديث، الكلاسيكي) — 30 templates.
- [x] QA batch fixes: (1) FREE-plan site-limit loophole closed via lifetime `sites_created` counter (delete no longer frees a slot on free plan; paid still active-count). (2) Domains page: friendly Arabic error + retry, no technical IP/whitelist leakage to visitors (logged to db.domain_diagnostics server-side), prices labeled "تقديري"/indicative, purchase gated. (3) Plan selection carried to /register?plan&cycle with summary card. (4) Free-tier clarity + plan limits + VAT note on Pricing. (5) Form labels/aria/autocomplete + type=tel on Register & Contact; clickable mailto/tel; terms/privacy consent on Register. (6) Loading states on Templates & Pricing. (7) Per-page SEO titles/descriptions via usePageMeta (BrandContext no longer overrides). (8) Unified payment wording ("قيد التفعيل"); improved legal/privacy/refund content (removed "trial" wording) + clearer subscription-expiry FAQ.
- [x] Verified by testing agent (iteration_5): backend 48/50 pass (2 = pre-existing pytest xdist ordering coupling, not a product bug), all QA frontend flows pass.

### Known external blockers (need user action)
- ResellerClub returns 403: preview egress IP **34.16.56.64** must be whitelisted in the ResellerClub account (IP changes on deploy; re-whitelist prod egress IP after deploy). Only domain search/pricing is wired — registration/purchase not built/enabled.
- Contact phone +966500000000 is a placeholder — set a real number in Admin → Settings.
- Moyasar keys not provided → electronic payment disabled.
- Production domain + wildcard DNS + SSL not set up → real subdomain serving & custom-domain verification disabled.

## Implemented (earlier)
- [x] Phase 2: Resend email (contact notifications + password reset), 2 extra templates (6 total), 3 new section types (team/pricing/cta). Homepage upgraded to outclass competitor mnasati.com: 3D builder mockup hero, payment-integrations trust strip, product-facts stats band, "why us" comparison. Verified 35/35 backend + frontend flows.
- [x] Marketing pages: Home, Templates (4, filter+preview), Pricing (monthly/yearly), Domain search (disabled purchase + notice), About, Contact (working), Terms/Privacy/Refund (CMS-driven).
- [x] Auth: email/password + Google; forgot/reset (token logged to console); profile + change password.
- [x] Customer dashboard: sites list with draft/published/suspended status, create from template, edit/preview/publish/unpublish/delete; billing overview + plan upgrade (payment disabled); domains connect (DNS records shown, verify gated); profile.
- [x] Section editor: 11 section types, pages CRUD + set home, reorder, per-section property forms, brand colors/logo/font, page SEO, image upload, mobile/desktop preview, draft save + publish. AI content generation.
- [x] Published site renderer at /s/{subdomain} with working contact form.
- [x] Admin: stats, customers (plan/suspend), templates (toggle), plans (edit price/features/limits), settings (identity/contact/CMS/integration flags), contacts inbox, audit log. RBAC enforced server-side.
- [x] Verified by testing agent: backend 31/31, frontend 100%.

## Backlog (prioritized)
### P0 (needs external config/keys)
- Moyasar payment: server-side verification, idempotent order refs, activate subscription on paid webhook.
- Platform root domain + wildcard DNS → real subdomain serving + custom-domain DNS verification + SSL.
- ResellerClub API: real availability/register/renew, split check→reserve→pay→register.

### P1
- Resend email: contact notifications + password-reset emails.
- Subscription lifecycle: renewal dates, cancel-renewal, expiry policy display.
- Storage quota enforcement (media size vs plan storage_mb).

### P2
- English locale (i18n) toggle.
- More templates + section types (pricing table, team, CTA banners).
- CSRF double-submit hardening; reset brute-force count after unlock window.

## Next Tasks
1. On user request: wire Moyasar (need merchant publishable/secret keys).
2. Provide platform root domain + configure wildcard DNS for live subdomain serving.
3. Provide ResellerClub reseller account + API credentials to enable domain sales.
