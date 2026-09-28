# PRD — منصتي (Manasati)

## Original Problem Statement
Arabic RTL SaaS platform to build websites and sell domains, similar in concept to website builders, targeting individuals and small businesses in Saudi Arabia and the Gulf. Temporary name «منصتي». Name/logo/colors configurable from admin. Arabic-first, full RTL, excellent mobile UX, structured to add English later. Customers register, pick a template, build & edit their site, preview, publish on a platform subdomain or connect their own domain, and search/buy domains (real purchase gated behind a real provider). Real product with DB, roles, dashboards — not mock pages.

## User Choices
- Auth: BOTH JWT email/password AND Emergent-managed Google login.
- Email: messages shown in dashboard now; Resend deferred.
- Payment: User explicitly chose **Tap Payments ONLY** («الغي البقية بس ابي تاب»), replacing active NeoLeap/Moyasar paths and cancelling the proposed PayPal addition. Implement hosted checkout for platform plan-period purchases in SANDBOX only; no recurring/live payments authorized. Implementation has NOT started: awaiting confirmation that the literal `Key` label in the provided credential is not part of the `sk_test_` token. ResellerClub is unrelated and must remain unchanged.
- Brand: retain «منصتي»; user supplied new logo/brand board and explicitly approved applying it: navy #071D32, blue #2563EB, pale #F4F7FC, tagline «فكرتك تبدأ بموقع».
- Domain reseller: ResellerClub. User confirmed a newly supplied API key belongs to this provider; saved securely in preview backend .env using existing RESELLERCLUB_API_KEY and reseller ID. Provider environment stays live; only read-only availability/pricing authorized. Upstream HTTP 403 still blocks validation.
- Phase 1 first: full journey (create → edit → publish → admin), then subscriptions/payments/domains.

## Architecture
- Frontend: React 19 + React Router 7 + Tailwind + shadcn/ui + framer-motion, full RTL (dir=rtl), fonts Tajawal/Cairo. Contexts: AuthContext, BrandContext (applies configurable brand colors via CSS vars).
- Backend: FastAPI + Motor (MongoDB). Routers: auth, sites, media, public, admin, account, ai. All routes under /api.
- Auth: JWT httpOnly cookies (access/refresh) + Emergent Google session_token; roles customer/admin; bcrypt; brute-force lockout; admin seeded from env (never auto-granted).
- Media: images stored base64 in Mongo, served via /api/media/{id} (max 5MB, type-validated).
- AI: Emergent universal LLM key (OpenAI gpt-5.4-mini + Gemini 3.1 Pro) for Arabic content generation in editor.



## Latest ResellerClub credential replacement (2026, iteration_11)
- User supplied a NEW replacement API CODE, then delegated environment choice («كما تريد»). Chosen goal: align preview and production; NEVER store the value in docs, source, reports or chat replies.
- Authoritative production inventory: RESELLERCLUB_API_KEY exists and does NOT match the new candidate. Reseller-ID/env/base-URL/availability-URL secret NAMES all exist. Deployer made no changes; existing production key must be updated by user through the Secrets UI.
- Updated ONLY preview backend .env RESELLERCLUB_API_KEY via dotenv.set_key, verified candidate equality privately and every other parsed env value unchanged. Restarted backend using supervisor. No provider queries, purchases, API redesign, production secret mutation or deployment performed.
- Testing_agent `/app/test_reports/iteration_11.json`: configuration/runtime equality checks passed; 13/13 MOCKED adapter tests passed; preview health200. ZERO real ResellerClub requests. This does NOT validate actual new-key authentication or resolve the historical403.
- Pending user step (must state exactly): Click on Re-publish -> Secrets Tab -> Click on 'View & edit' -> make changes to the key under its 'RESELLERCLUB_API_KEY' name -> then click on Save and Re-publish.
- After user confirms save: re-check authoritative production match, without echoing key. Do not run availability loops, pricing probes, or purchases. At most one explicitly approved read-only provider verification after access/IP allowlisting confirmed. User pasted a general abuse policy, NOT evidence of an actual24h account block.


## Read-only code review requested (2026)
- User explicitly requested review of deployed app. code_review_agent completed read-only review; no code/data/deployment changes made in this review turn. Exact deployed source revision was not established, so repo findings are not blanket claims about live image contents.
- Confirmed source findings: Billing.jsx load failure is silently swallowed and leaves endless spinner; real admin credential literal remains at backend/tests/test_manasati_backend.py:23-24 (value never reported); Editor.jsx duplicate store/logos object keys at50/51 and duplicate switch cases306/312; client-submitted store totals/prices remain trusted in public.py order endpoint (data-integrity concern before real checkout).
- Main independently ran explicit ESLint react-hooks/exhaustive-deps, rules-of-hooks, no-undef, no-dupe-keys and no-duplicate-case across frontend/src: ONLY four duplicate-key/case warnings in Editor; no hook/undefined errors. Pyflakes backend scan found no undefined names or parse errors. Alleged27 missing dependencies and6 undefined Python variables were not reproduced. Valid `is None`/strict boolean checks should not be blindly replaced.
- Live difference previously verified by iteration_10: correct live contact page/email, but no footer-phone in served production UI despite preview implementation. Exact build parity remains a limitation; do not call it a proven image revision without platform evidence.
- Review-only verdict: fixes recommended, not a deployment-readiness certification or security audit. Billing error/retry and store-total validation need regression coverage. External NeoLeap/ResellerClub blockers remain outside this code review. All future fixes require testing_agent verification per user instruction.


## Latest fix — live/preview contact mismatch (2026, iteration_10)
- User reported site differences, supplied preview URL, then confirmed «اللي ذكرت» refers to the identified old live contact details. Homepage visual identity matched in screenshots; API comparison proved live still had placeholder contacts.
- Deployer RCA: preview and production have independent settings data; preview edits do not sync into production on redeploy. No DNS or branding rewrite needed.
- Main used existing owner admin credentials privately to send one partial PUT to https://menasti.com/api/admin/settings for ONLY contact_email=jaberra72@gmail.com, contact_phone=0544354420, contact_details_version=1; HTTP200, then logged out. No user credentials/roles/sites/payment data changed, no redeploy triggered.
- REQUIRED post-fix testing-agent report `/app/test_reports/iteration_10.json` confirms real live API and /contact on desktop/mobile390, proper mailto/tel, persistence on reload, corrected footer email, no old contact placeholders. Preview matches contact values.
- Remaining visible difference: deployed footer does NOT render phone; preview Footer.jsx already implements it. Adding the footer phone live requires a separately authorized frontend publication; this is NOT claimed complete. Existing optional /auth/me 401 probes for guests are not JS crashes.
- Earlier user code-quality request remains pending after this interruption: actual hardcoded admin test password confirmed in backend/tests/test_manasati_backend.py; no fixes applied yet. Read auth/email/AuthContext/BrandContext/Register/PublicSite/Billing + sanitized test file. Auth/email refactor playbook consulted and backend-authorization skill loaded. Must run real React hooks lint + Python undefined-name checks before assuming all reported findings are valid; preserve `is None`/strict boolean checks. User authorized best judgment/full confirmed fixes and explicitly requires testing_agent AFTER fixes. Do NOT claim those review findings resolved.


## Latest user priorities and contact update (2026, iteration_9)
- User supplied public email jaberra72@gmail.com and phone 0544354420 and requested opening the platform on a purchased domain. Subsequently supplied **mansati.com** (preserve this exact spelling, not competitor mnasati.com). User emphasized urgency. Treat contacts as public details, not a request to replace the owner/admin login.
- Updated preview platform settings and DEFAULT_SETTINGS; one-time contact_details_version=1 migration ensures existing DBs adopt the approved contact fields on next code rollout without resetting future admin edits. Footer now includes phone link alongside email; existing Contact page consumes the same settings.
- Testing agent iteration_9 passed API contact values, correct mailto/tel links on Contact/footer, 390px no-overflow check, and read-only confirmation that ADMIN_EMAIL remains the original real owner. No user/site/payment data mutated and no email/SMS delivery claimed.
- Domain investigation resolved a spelling mismatch: production is live/healthy at https://domainly-gulf.emergent.host. **menasti.com** and **www.menasti.com** are already bound and verified with active SSL; https://menasti.com serves the app. User wrote **mansati.com**, which is a DIFFERENT, unbound domain on GiantPanda nameservers pointing to Linode/parking IPs; HTTPS validation fails there. Ask which spelling they actually own/intend. If menasti.com is intended, no DNS changes are needed. If mansati.com is intended, add it via Deployment Panel → Domains; exact DNS targets are generated at add-time, never copy another domain's targets. Preserve MX. RCA: /app/deployer-agent-docs/RCA_e7330947-7e0c-40ae-930c-48f729ac087e.MD. Public contacts were verified in preview only; production contact propagation is not yet verified.
- Recent integration requests still pending: user asked Emergent-managed Google login (existing integration must be reviewed, no auth code changed); ChatGPT AI models (existing OpenAI tools, expansion scope unanswered); PayPal (user will create account and return). PayPal planned defaults: alongside NeoLeap, platform subscription sandbox payments first; automatic renewal undecided. No PayPal integration implemented or credentials collected.


## ResellerClub key update and validation (2026, iteration_8)
- User confirmed supplied credential belongs to ResellerClub. Updated preview `RESELLERCLUB_API_KEY` only; existing reseller ID/live mode/database/owner settings preserved. Real admin email was already correct; no authentication changes.
- Integration playbook + official availability documentation used. Availability now uses configured `RESELLERCLUB_AVAILABILITY_URL`; pricing uses `RESELLERCLUB_BASE_URL`. Backend restarted after env updates. No secret values are stored in this document.
- `domain_provider.py`: central sanitized read-only request handler, HTTP/transport/invalid-JSON/provider-error handling without credential-bearing URLs; httpx INFO disabled to prevent query-key logging; unknown/missing statuses map to None, available to True, regthroughus/regthroughothers to False.
- Live provider remains blocked by HTTP 403 Cloudflare HTML. No real successful availability/pricing/authentication or purchase verified. UI keeps availability unconfirmed, prices indicative, and purchase disabled. Do not present mocked unit cases as provider success.
- `/test_reports/iteration_8.json`: 17/17 passed (13 MOCKED upstream unit cases + 4 real app API/smoke cases); browser domain search/error/retry/disabled-buy assertions passed. Product API is not mocked. Tests added: `/backend/tests/test_domain_provider.py`, `/backend/tests/test_domain_search_live.py`.
- QA noted historical logs/diagnostics held credential-bearing upstream errors. Redacted query API-key values in one backend log and 34 domain-diagnostic records, preserving other diagnostic content. Subsequent read-only scans verified no remaining unredacted api-key query values in those locations.
- Blocker: verify provider IP allowlist for preview 34.16.56.64; allow propagation. If still blocked, provider support must inspect the administrative-rule rejection. Exact WAF/allowlist relationship and key validity remain unproven; no bypass attempted by main agent.
- Other user-requested next steps remain pending: differentiated template layouts, downloadable identity pack, NeoLeap UAT after secure merchant configuration. This turn focused on the user's ResellerClub credential/IP follow-up.

## Implemented — Supplied identity refresh (2026, iteration_7)
- User request: «تصميم وهوية جديدة» with logo/brand board, followed by «الهوية الجديدة اضفها». Approved use of supplied marks, not generated replacements.
- Shared `BrandLogo.jsx` uses bundled transparent horizontal logo plus light-on-dark variant, avoids duplicate text, and continues respecting future custom admin logo URLs. Static assets: `/frontend/public/brand/`; original downloaded copies archived in `/reference_assets/brand/`.
- New `HomeHero.jsx`: pale blue/white composition, tagline «فكرتك تبدأ بموقع», real register/templates links, illustration cropped from the supplied brand board and explicitly labeled illustrative. Homepage supporting sections redesigned; removed old misleading partner strip and unsupported comparison/statistics.
- Navbar, footer, AuthShell presentation, customer/admin desktop and mobile layouts, editor header, template header, pricing-toggle contrast, and browser icon/theme/title now follow the new identity. No auth/payment/domain logic changed.
- `BrandContext.jsx` and CSS default navy #071D32, blue #2563EB; platform background #F4F7FC with Tajawal typography. TemplateTheme and customer color configs retain their own palette.
- `seed.py` applies an idempotent, versioned platform-only identity update (`brand_identity_version=1`) for logo/colors/font; future admin changes are not overwritten. Existing name/contact/legal/integration flags and customer sites are untouched by this migration.
- Verification: production frontend build passed; one desktop smoke screenshot; testing-agent `/test_reports/iteration_7.json`: 21/21 relevant backend tests and rebrand UI acceptance passed. Desktop 1920 and mobile 390/360, real logo/image loading, menu/navigation/FAQ, pricing toggle, template preview + scoped palette, existing admin/customer login, settings values, editor identity + preserved customer colors. No reported regressions. Added `/backend/tests/test_brand_identity.py`.
- This regression does NOT establish NeoLeap payment readiness, real DNS/SSL/domain registration, or user acceptance of template quality. Those remain explicitly pending below.

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
- ResellerClub read-only requests still return Cloudflare HTML HTTP 403 ('Request forbidden by administrative rules'). Latest verified preview egress: 34.16.56.64. Whitelist confirmation is pending; if configured and propagation has elapsed, ask provider support to investigate its protection rules using the error/IP. Do not claim that a separate Cloudflare whitelist is proven necessary or that credentials are valid: the blocked requests did not verify them. Real availability/pricing and registration/purchase remain unavailable.
- Deployment inventory previously found no production deployment. A later user message reports an asynchronous deployment has started; completion/live URL/production secrets/egress have NOT been verified. Recheck production egress after completion instead of assuming preview IP.
- Public contact details are now verified in BOTH preview and production: jaberra72@gmail.com / 0544354420 (iteration_10, production /contact desktop/mobile + API). Updated production via authorized partial admin settings PUT, contact_details_version=1, preserving owner and other data. Production footer shows the corrected email; footer phone is present in preview code but absent in served production UI, pending frontend rollout. Owner/admin remains hamad6668@gmail.com.
- NeoLeap merchant/UAT configuration is missing → real electronic payment disabled. Crypto/disabled-state checks from the previous session are not an end-to-end payment test.
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
### P0 (external configuration / end-to-end verification)
- NeoLeap UAT: merchant configuration via a secure settings channel; verify success/failure/cancel, callback authenticity, idempotency, and subscription activation only after confirmed payment. No live payment verified yet.
- Platform root domain + wildcard DNS → real subdomain serving + custom-domain DNS verification + SSL.
- ResellerClub: whitelist current egress, retest real availability/pricing in browser, then implement register/renew purchase lifecycle.

### P1
- Substantially differentiated, higher-quality template layouts; obtain user visual acceptance rather than increasing template count.
- Real recipient verification of Resend contact/reset delivery; Google sign-in interactive verification.
- Subscription lifecycle: renewal dates, cancel-renewal, expiry policy display.
- Storage quota enforcement (media size vs plan storage_mb); document media persistence.
- Broad functional acceptance: plan/template continuity after signup, AI usage/error states, editor save/reopen/images/links/order, publish/update flows, access isolation, mobile/accessibility, contact delivery. Identity regression is not a substitute for these.
- Smart Wizard: follow-up verification of post-iteration_6 free-limit feedback fix, without retesting full AI generation unnecessarily.

### P2
- English locale (i18n) toggle.
- Additional template/section types only after validating existing quality.
- CSRF double-submit hardening; reset brute-force count after unlock window.
- GitHub save is still a user action via Save to GitHub; no agent commit/push performed.

## Next Tasks
1. Await user visual acceptance of the supplied new identity (implemented and tested).
2. On request: improve specific template layouts with user visual direction.
3. On secure merchant configuration: verify NeoLeap UAT end-to-end.
4. On provider/domain configuration: verify ResellerClub and real production domain routing.
