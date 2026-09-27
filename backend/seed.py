from datetime import datetime, timezone
from db import db, serialize
from auth import hash_password, verify_password
import os


def _now():
    return datetime.now(timezone.utc).isoformat()


def U(pid):
    return f"https://images.unsplash.com/photo-{pid}?q=80&w=1600&auto=format&fit=crop"


# distinct, category-relevant imagery
BIZ = [U("1718220216044-006f43e3a9b1"), U("1559136555-9303baea8ebd"), U("1558959356-2f36c7322d3b"), U("1556761175-4b46a572b786")]
POR = [U("1516131206008-dd041a9764fd"), U("1561070791-2526d30994b5"), U("1561070791-36c11767b26a"), U("1534670007418-fbb7f6cf32c3")]
PER = [U("1560250097-0b93528c311a"), U("1494790108377-be9c29b29330"), U("1519085360753-af0119f7cbe7"), U("1676989880361-091e12efc056")]
SRV = [U("1517245386807-bb43f82c33c4"), U("1688380692117-63178554d76d"), U("1542744173-8e7e53415bb0"), U("1517048676732-d65bc937f952")]
STA = [U("1704440349159-e7f8a6db589f"), U("1778146476147-5f8d4bd03c79"), U("1596784326488-23581279e33d"), U("1702047048032-e734daa2473d")]
FOOD = [U("1663530761401-15eefb544889"), U("1467003909585-2f8a72700288"), U("1514326640560-7d063ef2aed5"), U("1572715376701-98568319fd0b")]
ECO = [U("1691096675075-de995918f3ce"), U("1691096674749-29069acd529c"), U("1691096674326-74cfe19c04cc"), U("1691096671143-d05c501339bc")]
MED = [U("1638202993928-7267aad84c31"), U("1758691463582-11aea602cd4a"), U("1758691462878-6edc3d3da1be"), U("1612531386530-97286d97c2d2")]
RE = [U("1505843795480-5cfb3c03f6ff"), U("1505843513577-22bb7d21e455"), U("1613490493576-7fde63acd811"), U("1613977257363-707ba9348227")]
GYM = [U("1548690312-e3b507d8c110"), U("1641337221253-fdc7237f6b61"), U("1722925541142-5db2668ca492"), U("1576678927484-cc907957088c")]


DEFAULT_SETTINGS = {
    "_key": "platform",
    "platform_name": "منصتي",
    "logo_url": None,
    "colors": {"primary": "#0A2540", "secondary": "#D4AF37", "accent": "#2563EB"},
    "font": "Tajawal",
    "contact_email": "info@manasati.sa",
    "contact_phone": "+966500000000",
    "platform_domain": "manasati.sa",
    "social": {"twitter": "", "instagram": "", "linkedin": ""},
    "pages_content": {
        "about": "منصتي هي منصة عربية متكاملة تساعد الأفراد وأصحاب المشاريع الصغيرة على إنشاء مواقع إلكترونية احترافية بسهولة، دون الحاجة إلى خبرة تقنية. نوفّر قوالب جاهزة ومحرّر بسيط وأدوات نشر وربط النطاقات، مع دعم كامل للغة العربية وتصميم يناسب السوق السعودي والخليجي.",
        "terms": "باستخدامك منصتي فإنك توافق على استخدام الخدمة وفق الأنظمة المعمول بها في المملكة العربية السعودية. أنت مسؤول عن محتوى موقعك والحفاظ على سرية بيانات حسابك. تحتفظ المنصة بحق تعليق الحسابات المخالفة. هذه شروط تجريبية قابلة للتعديل قبل الإطلاق الرسمي.",
        "privacy": "نحرص على حماية بياناتك الشخصية. نجمع البيانات اللازمة لتشغيل الخدمة فقط، ولا نشاركها مع أطراف ثالثة إلا وفق ما يتطلبه القانون أو تشغيل الخدمة. يمكنك طلب تعديل أو حذف بياناتك عبر التواصل معنا.",
        "refund": "يمكنك طلب استرجاع قيمة الاشتراك خلال 14 يومًا من الاشتراك إذا لم تُستخدم الخدمة بشكل فعلي. رسوم تسجيل النطاقات غير قابلة للاسترجاع بعد إتمام التسجيل لدى المزوّد. تُراجع الطلبات حسب سياسة الاسترجاع المعتمدة.",
        "contact": "يسعدنا تواصلك معنا لأي استفسار أو دعم فني. راسلنا عبر النموذج أدناه أو على بريد الدعم وسنرد في أقرب وقت.",
    },
    "integrations": {
        "moyasar_enabled": False,
        "domain_reseller_enabled": False,
        "domain_reseller_provider": "ResellerClub",
        "email_enabled": True,
    },
}


DEFAULT_PLANS = [
    {"name": "البداية", "price_monthly": 29, "price_yearly": 290, "currency": "SAR", "order": 1, "is_active": True,
     "features": ["موقع واحد", "حتى 5 صفحات", "نطاق فرعي مجاني", "قوالب أساسية", "نموذج تواصل"],
     "limits": {"sites": 1, "pages": 5, "storage_mb": 200, "custom_domain": False}, "highlight": False},
    {"name": "الاحترافية", "price_monthly": 79, "price_yearly": 790, "currency": "SAR", "order": 2, "is_active": True,
     "features": ["حتى 3 مواقع", "صفحات غير محدودة", "ربط نطاق خاص", "جميع القوالب", "إزالة شعار المنصة", "دعم أولوية"],
     "limits": {"sites": 3, "pages": 100, "storage_mb": 2000, "custom_domain": True}, "highlight": True},
    {"name": "الأعمال", "price_monthly": 149, "price_yearly": 1490, "currency": "SAR", "order": 3, "is_active": True,
     "features": ["حتى 10 مواقع", "صفحات غير محدودة", "ربط نطاقات متعددة", "مساحة تخزين موسّعة", "دعم مخصص"],
     "limits": {"sites": 10, "pages": 500, "storage_mb": 10000, "custom_domain": True}, "highlight": False},
]


_c = 0
def _sid(t):
    global _c
    _c += 1
    return f"sec_{t}_{_c}"


def _hero(title, subtitle, image, btn="تواصل معنا"):
    return {"id": _sid("hero"), "type": "hero", "data": {"title": title, "subtitle": subtitle, "image": image, "button_text": btn, "button_link": "#contact", "align": "center"}}

def _services(title, items):
    return {"id": _sid("services"), "type": "services", "data": {"title": title, "subtitle": "ما نقدّمه لك", "items": [{"title": t, "description": d, "icon": "sparkles"} for t, d in items]}}

def _text(title, body):
    return {"id": _sid("text"), "type": "text", "data": {"title": title, "body": body, "align": "start"}}

def _gallery(title, images):
    return {"id": _sid("gallery"), "type": "gallery", "data": {"title": title, "images": images}}

def _testimonials():
    return {"id": _sid("testi"), "type": "testimonials", "data": {"title": "آراء العملاء", "items": [
        {"name": "عميل سعيد", "role": "صاحب مشروع", "text": "تجربة ممتازة وسهلة، أنجزت موقعي بسرعة."},
        {"name": "عميلة", "role": "مصممة", "text": "احترافية عالية ودعم متعاون. أنصح بها بشدّة."}]}}

def _faq():
    return {"id": _sid("faq"), "type": "faq", "data": {"title": "الأسئلة الشائعة", "items": [
        {"q": "كيف أبدأ؟", "a": "اختر قالبًا وابدأ التعديل مباشرة من لوحة التحكم."},
        {"q": "هل يمكنني ربط نطاقي؟", "a": "نعم، تدعم المنصة ربط نطاق خاص في الباقات المناسبة."}]}}

def _contact():
    return {"id": _sid("contact"), "type": "contact", "data": {"title": "تواصل معنا", "subtitle": "سنسعد بالرد على استفساراتك", "show_phone": True, "show_email": True}}

def _footer(name):
    return {"id": _sid("footer"), "type": "footer", "data": {"text": f"© {name} - جميع الحقوق محفوظة", "links": []}}

def _team(imgs):
    return {"id": _sid("team"), "type": "team", "data": {"title": "فريق العمل", "subtitle": "نخبة من المحترفين",
            "members": [{"name": "اسم العضو", "role": "المسمى الوظيفي", "image": i} for i in imgs[:3]]}}

def _pricing():
    return {"id": _sid("pricing"), "type": "pricing", "data": {"title": "باقات الأسعار", "subtitle": "اختر ما يناسبك", "plans": [
        {"name": "أساسي", "price": "99", "period": "شهريًا", "features": ["ميزة أولى", "ميزة ثانية", "ميزة ثالثة"], "highlight": False},
        {"name": "احترافي", "price": "199", "period": "شهريًا", "features": ["كل ما سبق", "ميزة إضافية", "دعم أولوية"], "highlight": True},
        {"name": "متقدم", "price": "349", "period": "شهريًا", "features": ["كل المزايا", "مدير حساب", "تقارير مخصصة"], "highlight": False}]}}

def _cta():
    return {"id": _sid("cta"), "type": "cta", "data": {"title": "جاهز للبدء؟", "subtitle": "تواصل معنا اليوم واحصل على استشارة مجانية.", "button_text": "احجز الآن", "button_link": "#contact"}}

def _store(imgs, currency="SAR"):
    return {"id": _sid("store"), "type": "store", "data": {"title": "منتجاتنا", "currency": currency, "products": [
        {"name": "منتج مميّز", "description": "وصف مختصر للمنتج", "price": "120", "image": imgs[0]},
        {"name": "منتج رائج", "description": "وصف مختصر للمنتج", "price": "90", "image": imgs[1]},
        {"name": "منتج جديد", "description": "وصف مختصر للمنتج", "price": "150", "image": imgs[2]}]}}

def _logos():
    return {"id": _sid("logos"), "type": "logos", "data": {"title": "شركاؤنا وعملاؤنا", "logos": []}}


def _tpl(name, category, desc, thumb, colors, font, sections):
    return {"name": name, "category": category, "description": desc, "thumbnail": thumb, "is_active": True,
            "config": {"brand": {"colors": colors, "font": font},
                       "pages": [{"id": "page_home", "title": "الرئيسية", "slug": "home", "is_home": True,
                                  "seo": {"title": name, "description": desc, "image": thumb}, "sections": sections}]}}


def _template_defs():
    return [
        _tpl("نشاط تجاري", "أعمال", "موقع تعريفي احترافي لنشاطك التجاري مع خدمات وآراء عملاء وتواصل.", BIZ[0],
             {"primary": "#0A2540", "secondary": "#D4AF37", "accent": "#2563EB"}, "Tajawal",
             [_hero("اسم نشاطك التجاري", "نقدّم لك حلولًا احترافية تناسب احتياجاتك بجودة عالية.", BIZ[0]),
              _services("خدماتنا", [("خدمة أولى", "وصف موجز للخدمة الأولى."), ("خدمة ثانية", "وصف موجز للخدمة الثانية."), ("خدمة ثالثة", "وصف موجز للخدمة الثالثة.")]),
              _text("عن الشركة", "نبذة تعريفية عن شركتك ورؤيتها وقيمها وما يميّزها عن غيرها في السوق."),
              _testimonials(), _faq(), _contact(), _footer("نشاطي التجاري")]),

        _tpl("معرض أعمال", "إبداعي", "اعرض مشاريعك وأعمالك في معرض بصري أنيق يبرز إبداعك.", POR[0],
             {"primary": "#111827", "secondary": "#F59E0B", "accent": "#EF4444"}, "Cairo",
             [_hero("معرض أعمالي", "مجموعة مختارة من مشاريعي التي أفخر بها.", POR[0]),
              _gallery("أحدث الأعمال", POR + BIZ[:2]),
              _text("عني", "نبذة عن خبرتي ومجال عملي وأسلوبي في تنفيذ المشاريع."),
              _testimonials(), _contact(), _footer("معرض أعمالي")]),

        _tpl("صفحة شخصية", "شخصي", "صفحة تعريفية شخصية تبرز سيرتك ومهاراتك ووسائل التواصل معك.", PER[0],
             {"primary": "#1E3A8A", "secondary": "#10B981", "accent": "#6366F1"}, "Tajawal",
             [_hero("مرحبًا، أنا الاسم", "نبذة قصيرة تعرّف بك وبمجال تخصصك.", PER[0]),
              _text("نبذة عني", "اكتب هنا نبذة عن نفسك، خبراتك، واهتماماتك المهنية."),
              _services("مهاراتي", [("مهارة", "وصف المهارة الأولى."), ("مهارة", "وصف المهارة الثانية."), ("مهارة", "وصف المهارة الثالثة.")]),
              _contact(), _footer("صفحتي الشخصية")]),

        _tpl("عرض خدمات", "أعمال", "صفحة هبوط لعرض خدماتك ودفع العملاء لاتخاذ إجراء.", SRV[0],
             {"primary": "#0F766E", "secondary": "#F59E0B", "accent": "#0EA5E9"}, "Cairo",
             [_hero("خدمات تصنع الفرق", "حلول مرنة تناسب مشروعك مهما كان حجمه.", SRV[0]),
              _services("خدماتنا", [("استشارة", "جلسة استشارية لتحديد احتياجك."), ("تنفيذ", "تنفيذ احترافي وسريع."), ("دعم", "دعم متواصل بعد التسليم.")]),
              _cta(), _faq(), _contact(), _footer("خدماتنا")]),

        _tpl("شركة ناشئة", "أعمال", "صفحة هبوط لشركة ناشئة مع باقات أسعار وفريق عمل ودعوة لإجراء.", STA[0],
             {"primary": "#4338CA", "secondary": "#F59E0B", "accent": "#06B6D4"}, "Tajawal",
             [_hero("نطوّر أفكارك إلى منتجات", "منصة متكاملة تساعد شركتك على النمو بسرعة.", STA[0]),
              _services("لماذا نحن", [("سرعة", "إطلاق أسرع لمنتجك."), ("مرونة", "حلول قابلة للتوسّع."), ("دعم", "فريق يساندك دائمًا.")]),
              _pricing(), _team(PER), _cta(), _footer("شركتنا الناشئة")]),

        _tpl("مطعم وكافيه", "إبداعي", "موقع أنيق لمطعم أو كافيه مع معرض للأطباق وخريطة وتواصل.", FOOD[0],
             {"primary": "#7C2D12", "secondary": "#D97706", "accent": "#B45309"}, "Cairo",
             [_hero("نكهة لا تُنسى", "أطباق شهية تُحضّر بحب من أجود المكوّنات.", FOOD[0]),
              _gallery("قائمتنا", FOOD),
              _text("قصتنا", "نبذة عن مطعمنا ورسالتنا في تقديم أفضل تجربة طعام لضيوفنا."),
              _testimonials(), _contact(),
              {"id": _sid("map"), "type": "map", "data": {"title": "موقعنا", "address": "Riyadh"}},
              _footer("مطعمنا")]),

        _tpl("متجر إلكتروني", "متاجر", "متجر إلكتروني بسلة شراء وطلبات فعلية لبيع المنتجات مباشرة.", ECO[0],
             {"primary": "#0F172A", "secondary": "#F59E0B", "accent": "#10B981"}, "Tajawal",
             [_hero("تسوّق الأفضل", "منتجات مختارة بعناية تصلك أينما كنت.", ECO[0]),
              _store(ECO), _logos(), _contact(), _footer("متجرنا")]),

        _tpl("عيادة طبية", "طبي", "موقع لعيادة أو مركز طبي مع الخدمات والأطباء وحجز التواصل.", MED[0],
             {"primary": "#0E7490", "secondary": "#10B981", "accent": "#0284C7"}, "Tajawal",
             [_hero("رعاية صحية تثق بها", "فريق طبي متخصص وأحدث التقنيات في خدمتك.", MED[0], btn="احجز موعدًا"),
              _services("خدماتنا الطبية", [("استشارات", "استشارات طبية دقيقة."), ("فحوصات", "فحوصات شاملة ومتقدمة."), ("متابعة", "متابعة دورية لحالتك.")]),
              _team(MED), _faq(), _contact(), _footer("عيادتنا")]),

        _tpl("عقارات", "عقارات", "موقع لعرض العقارات والمشاريع السكنية مع معرض وتواصل مباشر.", RE[3],
             {"primary": "#1C1917", "secondary": "#CA8A04", "accent": "#0D9488"}, "Cairo",
             [_hero("عقارك القادم يبدأ هنا", "مجموعة مختارة من أرقى العقارات والمشاريع.", RE[3], btn="استفسر الآن"),
              _gallery("أحدث العروض", RE),
              _services("خدماتنا", [("بيع", "تسويق وبيع عقارك بأفضل سعر."), ("إيجار", "إدارة وتأجير الوحدات."), ("استشارة", "استشارات عقارية موثوقة.")]),
              _contact(), _footer("شركة العقارات")]),

        _tpl("نادي رياضي", "لياقة", "موقع لنادٍ رياضي أو مدرب مع البرامج والاشتراكات ودعوة للانضمام.", GYM[3],
             {"primary": "#18181B", "secondary": "#EAB308", "accent": "#DC2626"}, "Cairo",
             [_hero("ابدأ رحلتك نحو لياقتك", "برامج تدريبية مصممة لتحقيق أهدافك.", GYM[3], btn="اشترك الآن"),
              _services("برامجنا", [("لياقة عامة", "برامج للمبتدئين والمحترفين."), ("تدريب شخصي", "مدرب خاص يرافقك."), ("تغذية", "خطط تغذية متكاملة.")]),
              _gallery("من النادي", GYM),
              _pricing(), _cta(), _footer("النادي الرياضي")]),
    ] + _more_templates()


_GROUPS = [
    ("نشاط تجاري", "أعمال", BIZ), ("معرض أعمال", "إبداعي", POR), ("صفحة شخصية", "شخصي", PER),
    ("عرض خدمات", "أعمال", SRV), ("شركة ناشئة", "أعمال", STA), ("مطعم وكافيه", "إبداعي", FOOD),
    ("متجر", "متاجر", ECO), ("عيادة طبية", "طبي", MED), ("عقارات", "عقارات", RE), ("نادي رياضي", "لياقة", GYM),
]
_VARIANTS = ["الحديث", "الكلاسيكي"]
_REMOVED_VARIANTS = ["الأنيق", "الجريء", "المبسّط"]
_PALETTES = [
    {"primary": "#0A2540", "secondary": "#D4AF37", "accent": "#2563EB"},
    {"primary": "#111827", "secondary": "#F59E0B", "accent": "#EF4444"},
    {"primary": "#0F766E", "secondary": "#F59E0B", "accent": "#0EA5E9"},
    {"primary": "#4338CA", "secondary": "#22D3EE", "accent": "#06B6D4"},
    {"primary": "#7C2D12", "secondary": "#D97706", "accent": "#B45309"},
    {"primary": "#1C1917", "secondary": "#CA8A04", "accent": "#0D9488"},
]


def _more_templates():
    out = []
    for gi, (base, cat, imgs) in enumerate(_GROUPS):
        for i, v in enumerate(_VARIANTS):
            colors = _PALETTES[(gi + i) % len(_PALETTES)]
            font = "Tajawal" if (gi + i) % 2 == 0 else "Cairo"
            thumb = imgs[i % len(imgs)]
            secs = [
                _hero(f"{base} {v}", "قالب احترافي جاهز قابل للتخصيص بالكامل من ألوان ونصوص وصور.", thumb),
                _services("مميزاتنا", [("ميزة أولى", "وصف موجز."), ("ميزة ثانية", "وصف موجز."), ("ميزة ثالثة", "وصف موجز.")]),
                _gallery("معرض", imgs),
                _testimonials(), _contact(), _footer(base),
            ]
            out.append(_tpl(f"{base} — {v}", cat, f"قالب {base} بأسلوب {v}، جاهز وقابل للتخصيص الكامل.", thumb, colors, font, secs))
    return out


async def run_seed():
    await db.users.create_index("email", unique=True)
    try:
        await db.password_reset_tokens.create_index("token", unique=True)
    except Exception:
        pass
    await db.login_attempts.create_index("identifier")
    await db.sites.create_index("subdomain", unique=True, sparse=True)
    await db.sites.create_index("owner_id")
    await db.user_sessions.create_index("session_token")

    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "email": admin_email, "name": "مدير المنصة",
            "password_hash": hash_password(admin_password), "role": "admin",
            "auth_provider": "password", "picture": None,
            "plan_id": None, "plan_cycle": None, "subscription_status": "none",
            "subscription_renews_at": None, "account_status": "active", "created_at": _now(),
        })
    else:
        updates = {"role": "admin"}
        if not verify_password(admin_password, existing.get("password_hash") or ""):
            updates["password_hash"] = hash_password(admin_password)
        await db.users.update_one({"email": admin_email}, {"$set": updates})

    if not await db.settings.find_one({"_key": "platform"}):
        await db.settings.insert_one(dict(DEFAULT_SETTINGS))

    if await db.plans.count_documents({}) == 0:
        for p in DEFAULT_PLANS:
            await db.plans.insert_one({**p, "created_at": _now()})

    # remove stale templates for deprecated variants so they disappear from the catalog
    if _REMOVED_VARIANTS:
        await db.templates.delete_many({"name": {"$in": [f"{base} — {v}" for base, _cat, _imgs in _GROUPS for v in _REMOVED_VARIANTS]}})

    # upsert templates by name so improvements refresh existing ones and add new
    for t in _template_defs():
        await db.templates.update_one({"name": t["name"]},
                                      {"$set": t, "$setOnInsert": {"created_at": _now()}}, upsert=True)
