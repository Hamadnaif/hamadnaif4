import os
import base64
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from db import db
from auth import get_current_user

router = APIRouter(prefix="/ai", tags=["ai"])


class GenerateBody(BaseModel):
    kind: str  # hero | text | services | faq | about
    context: str = ""
    provider: str = "openai"  # openai | gemini


PROMPTS = {
    "hero": "اكتب عنوانًا رئيسيًا جذّابًا (سطر واحد) وجملة وصفية قصيرة لقسم البطل (hero) في موقع.",
    "text": "اكتب فقرة نصية احترافية قصيرة (٣-٤ أسطر) لقسم محتوى في موقع.",
    "services": "اكتب ٣ خدمات، لكل خدمة عنوان قصير ووصف من سطر واحد.",
    "faq": "اكتب ٣ أسئلة شائعة مع إجاباتها المختصرة.",
    "about": "اكتب فقرة تعريفية احترافية عن نشاط تجاري.",
}


@router.post("/generate")
async def generate(body: GenerateBody, user: dict = Depends(get_current_user)):
    key = os.environ.get("EMERGENT_LLM_KEY")
    if not key:
        raise HTTPException(status_code=503, detail="مولّد المحتوى غير مفعّل")
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except Exception:
        raise HTTPException(status_code=503, detail="مكتبة الذكاء الاصطناعي غير متوفرة")
    base = PROMPTS.get(body.kind, PROMPTS["text"])
    prompt = f"{base}\nاكتب بالعربية الفصحى وبأسلوب تجاري مباشر بدون مبالغة. السياق: {body.context or 'نشاط عام'}\nأعد النص فقط دون مقدمات."
    chat = LlmChat(api_key=key, session_id=f"gen-{user['id']}",
                   system_message="أنت كاتب محتوى تسويقي عربي محترف.")
    if body.provider == "gemini":
        chat = chat.with_model("gemini", "gemini-3.1-pro-preview")
    else:
        chat = chat.with_model("openai", "gpt-5.4-mini")
    try:
        text = await chat.send_message(UserMessage(text=prompt))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"تعذّر توليد المحتوى: {e}")
    return {"text": text.strip() if isinstance(text, str) else str(text)}


class GenImageBody(BaseModel):
    prompt: str
    kind: str = "image"  # image | logo


@router.post("/generate-image")
async def generate_image(body: GenImageBody, user: dict = Depends(get_current_user)):
    key = os.environ.get("EMERGENT_LLM_KEY")
    if not key:
        raise HTTPException(status_code=503, detail="مولّد الصور غير مفعّل")
    if not body.prompt.strip():
        raise HTTPException(status_code=400, detail="أدخل وصفًا للصورة")
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except Exception:
        raise HTTPException(status_code=503, detail="مكتبة الذكاء الاصطناعي غير متوفرة")

    if body.kind == "logo":
        prompt = (f"Design a clean, modern, minimalist vector-style brand logo on a plain solid "
                  f"background, centered, professional, high quality, no watermark. Concept: {body.prompt}")
    else:
        prompt = (f"Create a high-quality, professional photograph/illustration suitable for a website "
                  f"section. Detailed, well-lit, modern. Subject: {body.prompt}")

    from datetime import datetime, timezone
    chat = LlmChat(api_key=key, session_id=f"img-{user['id']}",
                   system_message="You are an expert visual designer and photographer.")
    chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])
    try:
        _text, images = await chat.send_message_multimodal_response(UserMessage(text=prompt))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"تعذّر توليد الصورة: {e}")
    if not images:
        raise HTTPException(status_code=502, detail="لم يتم توليد صورة، جرّب وصفًا آخر")
    img = images[0]
    raw = base64.b64decode(img["data"])
    doc = {
        "owner_id": user["id"], "filename": f"ai-{body.kind}.png",
        "content_type": img.get("mime_type", "image/png"), "size": len(raw),
        "data_b64": img["data"], "source": "ai",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    res = await db.media.insert_one(doc)
    return {"id": str(res.inserted_id), "url": f"/api/media/{res.inserted_id}"}


class GenTemplateBody(BaseModel):
    prompt: str


@router.post("/generate-template")
async def generate_template(body: GenTemplateBody, user: dict = Depends(get_current_user)):
    key = os.environ.get("EMERGENT_LLM_KEY")
    if not key or not body.prompt.strip():
        raise HTTPException(status_code=400, detail="أدخل وصف نشاطك")
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except Exception:
        raise HTTPException(status_code=503, detail="مكتبة الذكاء الاصطناعي غير متوفرة")
    import json as _json
    schema = ('أعد JSON فقط بالشكل: {"name":"اسم الموقع","colors":{"primary":"#hex","secondary":"#hex","accent":"#hex"},'
              '"sections":[{"type":"hero","data":{"title":"","subtitle":"","button_text":"تواصل معنا"}},'
              '{"type":"services","data":{"title":"خدماتنا","items":[{"title":"","description":""}]}},'
              '{"type":"text","data":{"title":"","body":""}},'
              '{"type":"faq","data":{"title":"الأسئلة الشائعة","items":[{"q":"","a":""}]}},'
              '{"type":"contact","data":{"title":"تواصل معنا","show_phone":true,"show_email":true}},'
              '{"type":"footer","data":{"text":""}}]}. '
              'الأنواع المسموحة: hero, text, services, gallery, testimonials, team, pricing, cta, faq, contact, footer. '
              'اكتب محتوى عربيًا واقعيًا ومناسبًا للنشاط. لا تضف أي نص خارج JSON.')
    chat = LlmChat(api_key=key, session_id=f"tpl-{user['id']}",
                   system_message="أنت مصمم مواقع عربي محترف تُخرج JSON صالحًا فقط.")
    chat.with_model("openai", "gpt-5.4-mini")
    try:
        raw = await chat.send_message(UserMessage(text=f"النشاط: {body.prompt}\n{schema}"))
        txt = raw if isinstance(raw, str) else str(raw)
        txt = txt[txt.find("{"): txt.rfind("}") + 1]
        data = _json.loads(txt)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"تعذّر توليد القالب: {e}")
    colors = data.get("colors") or {"primary": "#0A2540", "secondary": "#D4AF37", "accent": "#2563EB"}
    sections = []
    for i, s in enumerate(data.get("sections", [])):
        if isinstance(s, dict) and s.get("type"):
            sections.append({"id": f"sec_{s['type']}_{i}", "type": s["type"], "data": s.get("data", {})})
    if not sections:
        raise HTTPException(status_code=502, detail="لم يتم توليد أقسام")
    config = {"brand": {"colors": colors, "font": "Tajawal", "logo": None},
              "pages": [{"id": "page_home", "title": "الرئيسية", "slug": "home", "is_home": True,
                         "seo": {"title": data.get("name", ""), "description": "", "image": ""}, "sections": sections}]}
    return {"name": data.get("name") or "موقعي", "config": config}
