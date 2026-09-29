"""Read-only payout reconciliation; never transfers funds or activates subscriptions."""
import os
import io
import zipfile
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field, model_validator
import httpx
from db import db
from auth import get_current_user
from payment_orders import now
from tap_commerce import valid_id

router = APIRouter(prefix='/payouts', tags=['payouts'])


def configured():
    return os.environ.get('TAP_PAYOUTS_ENABLED') == 'true' and os.environ.get('TAP_PAYOUT_SECRET_KEY','').startswith('sk_test_')


async def provider(path, body, binary=False):
    if not configured():
        raise HTTPException(503, 'تقارير التحويلات قيد التفعيل مع Tap.')
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            async with client.stream('POST', 'https://api.tap.company/v2/payouts/'+path,
                    json=body, headers={'Authorization':'Bearer '+os.environ['TAP_PAYOUT_SECRET_KEY']}) as response:
                if response.is_error:
                    raise HTTPException(502, 'تعذّر جلب التقرير من Tap.')
                chunks=[]; size=0
                async for chunk in response.aiter_bytes():
                    size+=len(chunk)
                    if size > 20*1024*1024:
                        raise HTTPException(502, 'التقرير أكبر من الحد المتاح للتنزيل.')
                    chunks.append(chunk)
                content=b''.join(chunks)
        if binary:
            if not zipfile.is_zipfile(io.BytesIO(content)):
                raise HTTPException(502, 'صيغة ملف Tap غير صالحة؛ لم يتم تنزيل التقرير.')
            return content
        import json
        data=json.loads(content)
        if not isinstance(data,dict) or data.get('live_mode') is not False:
            raise HTTPException(502, 'التقرير لا يطابق بيئة الاختبار.')
        return data
    except (httpx.HTTPError, ValueError):
        raise HTTPException(502, 'تعذّر الاتصال بخدمة التقارير.') from None


class Period(BaseModel):
    date_from: int = Field(ge=0)
    date_to: int = Field(gt=0)

    @model_validator(mode='after')
    def valid_period(self):
        if not 0 < self.date_to-self.date_from <= 31*24*60*60*1000:
            raise ValueError('اختر فترة من يوم إلى 31 يومًا')
        return self


@router.get('')
async def saved_payouts(user=Depends(get_current_user)):
    rows=await db.payouts.find({'owner_id':user['id']},{'_id':0,'owner_id':0}).sort('date',-1).to_list(200)
    return {'configured':configured(),'mode':'test','webhook_enabled':False,'payouts':rows}


@router.post('/sync')
async def sync_payouts(period:Period,user=Depends(get_current_user)):
    account=await db.merchant_accounts.find_one({'owner_id':user['id']})
    # Legacy numeric merchant IDs in payout API must come from an authenticated Tap merchant event.
    merchant_id=(account or {}).get('tap_legacy_merchant_id')
    if not merchant_id:
        raise HTTPException(409, 'معرّف التاجر الخاص بالتقارير غير متوفر بعد.')
    data=await provider('list', {'period':{'date':{'from':period.date_from,'to':period.date_to}}})
    rows=data.get('payouts')
    if not isinstance(rows,list):
        raise HTTPException(502,'استجابة التقرير غير صالحة.')
    for row in rows:
        if not isinstance(row,dict) or str(row.get('merchant_id')) != merchant_id or not valid_id(row.get('id'),'payout_'):
            continue
        safe={k:row.get(k) for k in ('id','status','date','amount','currency','settlements_available')}
        safe.update(owner_id=user['id'],merchant_id=merchant_id,verified_at=now(),mode='test')
        await db.payouts.update_one({'id':row['id'],'owner_id':user['id']},{'$set':safe},upsert=True)
    return {**await saved_payouts(user),'has_more':bool(data.get('has_more'))}


@router.get('/{payout_id}/download')
async def download_payout(payout_id:str,user=Depends(get_current_user)):
    row=await db.payouts.find_one({'id':payout_id,'owner_id':user['id']})
    if not row or not valid_id(payout_id,'payout_'):
        raise HTTPException(404,'التحويل غير موجود')
    account=await db.merchant_accounts.find_one({'owner_id':user['id']})
    if not account or account.get('tap_legacy_merchant_id') != row['merchant_id']:
        raise HTTPException(404,'التحويل غير موجود')
    content=await provider('download',{'payouts':{'payout_id':[payout_id]}},binary=True)
    return Response(content,media_type='application/zip',headers={
        'Content-Disposition':f'attachment; filename="{payout_id}.zip"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'})


@router.post('/webhook')
async def payout_webhook():
    # Tap's published payout document specifies a signature, but not its header or algorithm.
    # Fail closed. Do not reuse the charge-specific hash formula for a different event type.
    raise HTTPException(503,'Payout signature contract pending Tap confirmation; use authenticated API sync.')
