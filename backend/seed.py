from datetime import datetime, timezone
from db import db, serialize
from auth import hash_password, verify_password
import os


def _now():
    return datetime.now(timezone.utc).isoformat()


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
    {
        "name": "البداية", "price_monthly": 29, "price_yearly": 290, "currency": "SAR",
        "order": 1, "is_active": True,
        "features": ["موقع واحد", "حتى 5 صفحات", "نطاق فرعي مجاني", "قوالب أساسية", "نموذج تواصل"],
        "limits": {"sites": 1, "pages": 5, "storage_mb": 200, "custom_domain": False},
        "highlight": False,
    },
    {
        "name": "الاحترافية", "price_monthly": 79, "price_yearly": 790, "currency": "SAR",
        "order": 2, "is_active": True,
        "features": ["حتى 3 مواقع", "صفحات غير محدودة", "ربط نطاق خاص", "جميع القوالب", "إزالة شعار المنصة", "دعم أولوية"],
        "limits": {"sites": 3, "pages": 100, "storage_mb": 2000, "custom_domain": True},
        "highlight": True,
    },
    {
        "name": "الأعمال", "price_monthly": 149, "price_yearly": 1490, "currency": "SAR",
        "order": 3, "is_active": True,
        "features": ["حتى 10 مواقع", "صفحات غير محدودة", "ربط نطاقات متعددة", "مساحة تخزين موسّعة", "دعم مخصص"],
        "limits": {"sites": 10, "pages": 500, "storage_mb": 10000, "custom_domain": True},
        "highlight": False,
    },
]


def _hero(title, subtitle, image):
    return {"id": "sec_hero", "type": "hero", "data": {
        "title": title, "subtitle": subtitle, "image": image,
        "button_text": "تواصل معنا", "button_link": "#contact",
        "align": "center"}}


def _services(items):
    return {"id": "sec_services", "type": "services", "data": {
        "title": "خدماتنا", "subtitle": "ما نقدّمه لك",
        "items": [{"title": t, "description": d, "icon": "sparkles"} for t, d in items]}}


def _text(title, body):
    return {"id": "sec_text_" + str(abs(hash(title)) % 9999), "type": "text",
            "data": {"title": title, "body": body, "align": "start"}}


def _gallery(images):
    return {"id": "sec_gallery", "type": "gallery", "data": {
        "title": "معرض الأعمال", "images": images}}


def _testimonials():
    return {"id": "sec_testimonials", "type": "testimonials", "data": {
        "title": "آراء العملاء",
        "items": [
            {"name": "عميل سعيد", "role": "صاحب مشروع", "text": "تجربة ممتازة وسهلة، أنجزت موقعي بسرعة."},
            {"name": "عميلة", "role": "مصممة", "text": "القوالب أنيقة والدعم متعاون. أنصح بها."},
        ]}}


def _faq():
    return {"id": "sec_faq", "type": "faq", "data": {
        "title": "الأسئلة الشائعة",
        "items": [
            {"q": "كيف أبدأ؟", "a": "اختر قالبًا وابدأ التعديل مباشرة من لوحة التحكم."},
            {"q": "هل يمكنني ربط نطاقي؟", "a": "نعم، تدعم المنصة ربط نطاق خاص في الباقات المناسبة."},
        ]}}


def _contact():
    return {"id": "sec_contact", "type": "contact", "data": {
        "title": "تواصل معنا", "subtitle": "سنسعد بالرد على استفساراتك",
        "show_phone": True, "show_email": True}}


def _footer(name):
    return {"id": "sec_footer", "type": "footer", "data": {
        "text": f"© {name} - جميع الحقوق محفوظة", "links": []}}


def _team():
    return {"id": "sec_team", "type": "team", "data": {
        "title": "فريق العمل", "subtitle": "نخبة من المحترفين",
        "members": [
            {"name": "اسم العضو", "role": "المسمى الوظيفي", "image": ""},
            {"name": "اسم العضو", "role": "المسمى الوظيفي", "image": ""},
            {"name": "اسم العضو", "role": "المسمى الوظيفي", "image": ""},
        ]}}


def _pricing():
    return {"id": "sec_pricing", "type": "pricing", "data": {
        "title": "باقات الأسعار", "subtitle": "اختر ما يناسبك",
        "plans": [
            {"name": "أساسي", "price": "99", "period": "شهريًا", "features": ["ميزة أولى", "ميزة ثانية", "ميزة ثالثة"], "highlight": False},
            {"name": "احترافي", "price": "199", "period": "شهريًا", "features": ["كل ما سبق", "ميزة إضافية", "دعم أولوية"], "highlight": True},
            {"name": "متقدم", "price": "349", "period": "شهريًا", "features": ["كل المزايا", "مدير حساب", "تقارير مخصصة"], "highlight": False},
        ]}}


def _cta():
    return {"id": "sec_cta", "type": "cta", "data": {
        "title": "جاهز للبدء؟", "subtitle": "تواصل معنا اليوم واحصل على استشارة مجانية.",
        "button_text": "احجز الآن", "button_link": "#contact"}}


def _store():
    return {"id": "sec_store", "type": "store", "data": {
        "title": "منتجاتنا", "currency": "SAR",
        "products": [
            {"name": "منتج أول", "description": "وصف مختصر للمنتج", "price": "120", "image": IMG},
            {"name": "منتج ثاني", "description": "وصف مختصر للمنتج", "price": "90", "image": IMG2},
            {"name": "منتج ثالث", "description": "وصف مختصر للمنتج", "price": "150", "image": IMG3},
        ]}}


def _logos():
    return {"id": "sec_logos", "type": "logos", "data": {
        "title": "شركاؤنا وعملاؤنا", "logos": []}}


IMG = "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1600&auto=format&fit=crop"
IMG2 = "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1600&auto=format&fit=crop"
IMG3 = "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1600&auto=format&fit=crop"


def _template_defs():
    return [
        {
            "name": "نشاط تجاري", "category": "أعمال",
            "description": "موقع تعريفي احترافي لنشاطك التجاري مع أقسام للخدمات والتواصل.",
            "thumbnail": IMG, "is_active": True,
            "config": {
                "brand": {"colors": {"primary": "#0A2540", "secondary": "#D4AF37", "accent": "#2563EB"}, "font": "Tajawal"},
                "pages": [{
                    "id": "page_home", "title": "الرئيسية", "slug": "home", "is_home": True,
                    "seo": {"title": "نشاطي التجاري", "description": "نقدّم خدمات احترافية تلبّي احتياجاتك.", "image": ""},
                    "sections": [
                        _hero("اسم نشاطك التجاري", "نقدّم لك حلولًا احترافية تناسب احتياجاتك بجودة عالية.", IMG),
                        _services([("خدمة أولى", "وصف موجز للخدمة الأولى التي تقدّمها."),
                                   ("خدمة ثانية", "وصف موجز للخدمة الثانية التي تقدّمها."),
                                   ("خدمة ثالثة", "وصف موجز للخدمة الثالثة التي تقدّمها.")]),
                        _testimonials(), _faq(), _contact(), _footer("نشاطي التجاري"),
                    ],
                }],
            },
        },
        {
            "name": "معرض أعمال", "category": "إبداعي",
            "description": "اعرض أعمالك ومشاريعك بشكل بصري جذّاب في معرض أنيق.",
            "thumbnail": IMG2, "is_active": True,
            "config": {
                "brand": {"colors": {"primary": "#111827", "secondary": "#F59E0B", "accent": "#EF4444"}, "font": "Cairo"},
                "pages": [{
                    "id": "page_home", "title": "الرئيسية", "slug": "home", "is_home": True,
                    "seo": {"title": "معرض أعمالي", "description": "مجموعة مختارة من أعمالي ومشاريعي.", "image": ""},
                    "sections": [
                        _hero("معرض أعمالي", "مجموعة مختارة من مشاريعي التي أفخر بها.", IMG2),
                        _gallery([IMG, IMG2, IMG3, IMG, IMG2, IMG3]),
                        _text("عني", "نبذة عن خبرتي ومجال عملي وأسلوبي في تنفيذ المشاريع."),
                        _contact(), _footer("معرض أعمالي"),
                    ],
                }],
            },
        },
        {
            "name": "صفحة شخصية", "category": "شخصي",
            "description": "صفحة تعريفية شخصية تبرز سيرتك ومهاراتك ووسائل التواصل معك.",
            "thumbnail": IMG3, "is_active": True,
            "config": {
                "brand": {"colors": {"primary": "#1E3A8A", "secondary": "#10B981", "accent": "#6366F1"}, "font": "Tajawal"},
                "pages": [{
                    "id": "page_home", "title": "الرئيسية", "slug": "home", "is_home": True,
                    "seo": {"title": "صفحتي الشخصية", "description": "تعرّف عليّ وعلى مهاراتي.", "image": ""},
                    "sections": [
                        _hero("مرحبًا، أنا الاسم", "نبذة قصيرة تعرّف بك وبمجال تخصصك.", IMG3),
                        _text("نبذة عني", "اكتب هنا نبذة عن نفسك، خبراتك، واهتماماتك المهنية."),
                        _services([("مهارة", "وصف المهارة الأولى."), ("مهارة", "وصف المهارة الثانية.")]),
                        _contact(), _footer("صفحتي الشخصية"),
                    ],
                }],
            },
        },
        {
            "name": "عرض خدمات", "category": "أعمال",
            "description": "صفحة هبوط لعرض خدماتك وباقاتك ودفع العملاء لاتخاذ إجراء.",
            "thumbnail": IMG, "is_active": True,
            "config": {
                "brand": {"colors": {"primary": "#0F766E", "secondary": "#F59E0B", "accent": "#0EA5E9"}, "font": "Cairo"},
                "pages": [{
                    "id": "page_home", "title": "الرئيسية", "slug": "home", "is_home": True,
                    "seo": {"title": "خدماتنا", "description": "باقات وخدمات مصمّمة لتلبية احتياجك.", "image": ""},
                    "sections": [
                        _hero("خدمات تصنع الفرق", "حلول مرنة تناسب مشروعك مهما كان حجمه.", IMG),
                        _services([("استشارة", "جلسة استشارية لتحديد احتياجك."),
                                   ("تنفيذ", "تنفيذ احترافي وسريع."),
                                   ("دعم", "دعم متواصل بعد التسليم.")]),
                        _faq(), _testimonials(), _contact(), _footer("خدماتنا"),
                    ],
                }],
            },
        },
        {
            "name": "شركة ناشئة", "category": "أعمال",
            "description": "صفحة هبوط لشركة ناشئة مع باقات أسعار وفريق عمل ودعوة لإجراء.",
            "thumbnail": IMG2, "is_active": True,
            "config": {
                "brand": {"colors": {"primary": "#4338CA", "secondary": "#F59E0B", "accent": "#06B6D4"}, "font": "Tajawal"},
                "pages": [{
                    "id": "page_home", "title": "الرئيسية", "slug": "home", "is_home": True,
                    "seo": {"title": "شركتنا الناشئة", "description": "حلول مبتكرة لمشروعك.", "image": ""},
                    "sections": [
                        _hero("نطوّر أفكارك إلى منتجات", "منصة متكاملة تساعد شركتك على النمو بسرعة.", IMG2),
                        _services([("سرعة", "إطلاق أسرع لمنتجك."), ("مرونة", "حلول قابلة للتوسّع."), ("دعم", "فريق يساندك دائمًا.")]),
                        _pricing(), _team(), _cta(), _footer("شركتنا الناشئة"),
                    ],
                }],
            },
        },
        {
            "name": "مطعم وكافيه", "category": "إبداعي",
            "description": "موقع أنيق لمطعم أو كافيه مع معرض للأطباق ونموذج حجز/تواصل وخريطة.",
            "thumbnail": IMG3, "is_active": True,
            "config": {
                "brand": {"colors": {"primary": "#7C2D12", "secondary": "#D97706", "accent": "#B45309"}, "font": "Cairo"},
                "pages": [{
                    "id": "page_home", "title": "الرئيسية", "slug": "home", "is_home": True,
                    "seo": {"title": "مطعمنا", "description": "نكهات تجمع الأصالة والإبداع.", "image": ""},
                    "sections": [
                        _hero("نكهة لا تُنسى", "أطباق شهية تُحضّر بحب من أجود المكوّنات.", IMG3),
                        _gallery([IMG, IMG2, IMG3, IMG, IMG2, IMG3]),
                        _text("قصتنا", "نبذة عن مطعمنا ورسالتنا في تقديم أفضل تجربة طعام لضيوفنا."),
                        _testimonials(), _contact(),
                        {"id": "sec_map", "type": "map", "data": {"title": "موقعنا", "address": "Riyadh"}},
                        _footer("مطعمنا"),
                    ],
                }],
            },
        },
        {
            "name": "متجر إلكتروني", "category": "متاجر",
            "description": "متجر إلكتروني بسلة شراء وطلبات فعلية، يناسب بيع المنتجات مباشرة للعملاء.",
            "thumbnail": IMG, "is_active": True,
            "config": {
                "brand": {"colors": {"primary": "#0F172A", "secondary": "#F59E0B", "accent": "#10B981"}, "font": "Tajawal"},
                "pages": [{
                    "id": "page_home", "title": "الرئيسية", "slug": "home", "is_home": True,
                    "seo": {"title": "متجرنا", "description": "تسوّق أفضل المنتجات بأسعار مميزة.", "image": ""},
                    "sections": [
                        _hero("تسوّق الأفضل", "منتجات مختارة بعناية تصلك أينما كنت.", IMG),
                        _store(), _logos(), _contact(), _footer("متجرنا"),
                    ],
                }],
            },
        },
    ]


async def run_seed():
    # indexes
    await db.users.create_index("email", unique=True)
    try:
        await db.password_reset_tokens.create_index("token", unique=True)
    except Exception:
        pass
    await db.login_attempts.create_index("identifier")
    await db.sites.create_index("subdomain", unique=True, sparse=True)
    await db.sites.create_index("owner_id")
    await db.user_sessions.create_index("session_token")

    # admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "email": admin_email, "name": "مدير المنصة",
            "password_hash": hash_password(admin_password), "role": "admin",
            "auth_provider": "password", "picture": None,
            "plan_id": None, "plan_cycle": None, "subscription_status": "none",
            "subscription_renews_at": None, "account_status": "active",
            "created_at": _now(),
        })
    else:
        updates = {"role": "admin"}
        if not verify_password(admin_password, existing.get("password_hash") or ""):
            updates["password_hash"] = hash_password(admin_password)
        await db.users.update_one({"email": admin_email}, {"$set": updates})

    # settings
    if not await db.settings.find_one({"_key": "platform"}):
        await db.settings.insert_one(dict(DEFAULT_SETTINGS))

    # plans
    if await db.plans.count_documents({}) == 0:
        for p in DEFAULT_PLANS:
            await db.plans.insert_one({**p, "created_at": _now()})

    # templates (insert any missing by name so new templates are added on redeploy)
    existing_names = set(await db.templates.distinct("name"))
    for t in _template_defs():
        if t["name"] not in existing_names:
            await db.templates.insert_one({**t, "created_at": _now()})
