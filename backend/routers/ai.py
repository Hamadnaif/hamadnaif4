import os
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

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
