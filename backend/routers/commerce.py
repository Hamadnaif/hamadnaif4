import hashlib
import hmac
import json
import os
import secrets
from datetime import datetime, timezone, timedelta
from decimal import Decimal, InvalidOperation
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field, SecretStr
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError
from db import db, to_oid
from auth import get_current_user
from payment_orders import now
import tap_commerce
import tap_service

router = APIRouter(prefix='/commerce', tags=['commerce'])


def summary(account):
    account = account or {}
    return {'configured': tap_commerce.is_configured(), 'mode': 'test',
            **{k: account.get(k) for k in ('status', 'tap_lead_id', 'tap_merchant_id', 'connect_url', 'updated_at')},
            'is_acceptance_allowed': account.get('is_acceptance_allowed') is True}


@router.get('/account')
async def account_status(user=Depends(get_current_user)):
    return summary(await db.merchant_accounts.find_one({'owner_id': user['id']}))


class OnboardBody(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    brand_name: str = Field(min_length=3, max_length=100)
    first_name: str = Field(min_length=2, max_length=60)
    last_name: str = Field(min_length=2, max_length=60)
    phone: str = Field(pattern=r'^5[0-9]{8}$')
    identification_type: Literal['national_id', 'iqamah'] = 'national_id'
    identification_number: str = Field(pattern=r'^[12][0-9]{9}$', repr=False)
    nationality: str = Field(pattern=r'^[A-Z]{2}$', default='SA')
    consent: Literal[True]


@router.post('/connect')
async def onboard(body: OnboardBody, user=Depends(get_current_user)):
    if not tap_commerce.is_configured():
        raise HTTPException(503, 'تفعيل مدفوعات المتاجر متوقف حتى استكمال إعدادات Tap للمنصة.')
    try:
        await db.merchant_accounts.update_one({'owner_id': user['id']}, {'$setOnInsert': {
            'owner_id': user['id'], 'status': 'not_started', 'callback_token': secrets.token_urlsafe(32),
            'is_acceptance_allowed': False, 'created_at': now()}}, upsert=True)
    except DuplicateKeyError:
        pass
    account = await db.merchant_accounts.find_one({'owner_id': user['id']})
    if account.get('tap_lead_id'):
        return await resume(user)
    # Do not automatically repeat uncertain lead creation; provider lead POST has no documented idempotency.
    claimed = await db.merchant_accounts.find_one_and_update(
        {'_id': account['_id'], 'status': 'not_started'},
        {'$set': {'status': 'creating', 'updated_at': now()}}, return_document=ReturnDocument.AFTER)
    if not claimed:
        raise HTTPException(409, 'طلب التفعيل قيد المراجعة. لا تنشئ طلبًا آخر؛ تواصل مع الدعم إذا استمرت الحالة.')
    try:
        lead = await tap_commerce.create_lead(account, body, user)
        await db.merchant_accounts.update_one({'_id': account['_id']}, {'$set': {
            'tap_lead_id': lead, 'status': 'pending', 'updated_at': now()}})
        return await resume(user)
    except tap_service.TapError as exc:
        await db.merchant_accounts.update_one({'_id': account['_id'], 'status': 'creating'},
            {'$set': {'status': 'verification_required', 'updated_at': now()}})
        raise HTTPException(exc.status_code, str(exc)) from None


@router.post('/connect/resume')
async def resume(user=Depends(get_current_user)):
    account = await db.merchant_accounts.find_one({'owner_id': user['id']})
    if not account or not account.get('tap_lead_id'):
        raise HTTPException(409, 'ابدأ طلب التفعيل أولًا.')
    try:
        url = await tap_commerce.connect(account)
    except tap_service.TapError as exc:
        raise HTTPException(exc.status_code, str(exc)) from None
    await db.merchant_accounts.update_one({'_id': account['_id']}, {'$set': {'connect_url': url, 'updated_at': now()}})
    return summary(await db.merchant_accounts.find_one({'_id': account['_id']}))


@router.post('/connect/webhook/{account_id}/{token}')
async def connect_webhook(account_id: str, token: str, request: Request):
    account = await db.merchant_accounts.find_one({'_id': to_oid(account_id)})
    if not account or not hmac.compare_digest(account['callback_token'], token):
        raise HTTPException(404, 'غير موجود')
    raw = await request.body()
    if len(raw) > 65536:
        raise HTTPException(413, 'حجم الإشعار غير مسموح')
    try:
        event = json.loads(raw)
    except ValueError:
        raise HTTPException(400, 'إشعار غير صالح') from None
    if not isinstance(event, dict):
        raise HTTPException(400, 'إشعار غير صالح')
    merchant = event if event.get('object') == 'merchant' else event.get('merchant', {})
    if not isinstance(merchant, dict) or not tap_commerce.valid_id(merchant.get('id'), 'merchant_'):
        return {'received': True, 'updated': False}
    if merchant.get('live_mode', event.get('live_mode')) is not False:
        raise HTTPException(400, 'إشعار خارج وضع الاختبار')
    if account.get('tap_merchant_id') and account['tap_merchant_id'] != merchant['id']:
        raise HTTPException(409, 'مرجع تاجر مختلف')
    platforms = merchant.get('platforms', [])
    if not any(isinstance(p, dict) and p.get('id') == os.environ.get('TAP_PLATFORM_ID') for p in platforms):
        raise HTTPException(409, 'التاجر غير مرتبط بهذه المنصة')
    # Only full merchant lifecycle events can affect acceptance. Board-only events cannot enable payment.
    if not isinstance(merchant.get('is_acceptance_allowed'), bool):
        return {'received': True, 'updated': False}
    event_time = merchant.get('updated') or merchant.get('created')
    if not isinstance(event_time, (int, float)):
        raise HTTPException(400, 'الإشعار يفتقد وقت التحديث')
    allowed = merchant['is_acceptance_allowed']
    try:
        await db.merchant_accounts.update_one({'_id': account['_id'], '$or': [
            {'event_time': {'$exists': False}}, {'event_time': {'$lt': event_time}}]}, {'$set': {
                'tap_merchant_id': merchant['id'], 'is_acceptance_allowed': allowed,
                'status': 'active' if allowed else 'pending', 'event_time': event_time, 'updated_at': now(),
                **({'tap_legacy_merchant_id': str(merchant['legacy_id'])} if str(merchant.get('legacy_id', '')).isdigit() else {}),
                **({'tap_business_id': merchant['business_id']} if tap_commerce.valid_id(merchant.get('business_id'), 'bus_') else {})}})
    except DuplicateKeyError:
        raise HTTPException(409, 'حساب التاجر مرتبط بحساب آخر') from None
    return {'received': True}


def validate_store_charge(order, charge):
    try:
        oid = str(order['_id'])
        matches = (charge.get('object') == 'charge' and charge.get('live_mode') is False
                   and charge.get('id') == order.get('payment_id')
                   and charge.get('currency') == 'SAR'
                   and Decimal(str(charge.get('amount'))) == Decimal(str(order['total']))
                   and charge.get('reference', {}).get('order') == oid
                   and charge.get('reference', {}).get('transaction') == oid
                   and charge.get('metadata', {}).get('store_order_id') == oid
                   and charge.get('merchant', {}).get('id') == order['tap_merchant_id']
                   and charge.get('platform', {}).get('id') == order['tap_platform_id'])
    except (TypeError, InvalidOperation, AttributeError, KeyError):
        matches = False
    if not matches:
        raise HTTPException(409, 'بيانات الدفعة لا تطابق طلب المتجر.')


async def settle_store(order, charge):
    validate_store_charge(order, charge)
    status = charge.get('status')
    payment_status = ('paid' if status == 'CAPTURED' else 'failed' if status in {
        'FAILED', 'DECLINED', 'CANCELLED', 'ABANDONED', 'VOID', 'TIMEDOUT', 'RESTRICTED'} else 'pending')
    await db.store_orders.update_one({'_id': order['_id'], 'payment_status': {'$ne': 'paid'}}, {'$set': {
        'payment_status': payment_status, 'gateway_status': status, 'updated_at': now()}})
    return await db.store_orders.find_one({'_id': order['_id']})


async def start_store_payment(order):
    if order.get('payment_id'):
        charge = await tap_commerce.retrieve_charge(order['payment_id'])
    else:
        if order.get('creation_started_at') and datetime.now(timezone.utc) - datetime.fromisoformat(order['creation_started_at']) >= timedelta(hours=23):
            raise HTTPException(409, 'راجع الدعم للتحقق من هذا الطلب قبل إعادة الدفع.')
        cutoff = (datetime.now(timezone.utc) - timedelta(seconds=60)).isoformat()
        claimed = await db.store_orders.find_one_and_update({'_id': order['_id'], 'payment_id': None, '$or': [
            {'creation_locked_at': {'$exists': False}}, {'creation_locked_at': {'$lt': cutoff}}]},
            {'$set': {'creation_locked_at': now(), 'creation_started_at': order.get('creation_started_at') or now()}},
            return_document=ReturnDocument.AFTER)
        if not claimed:
            raise HTTPException(409, 'جارٍ تجهيز نفس الدفعة. انتظر دقيقة ثم أعد المحاولة.')
        charge = await tap_commerce.create_store_charge(order)
        validate_store_charge({**order, 'payment_id': charge['id']}, charge)
        await db.store_orders.update_one({'_id': order['_id'], 'payment_id': None}, {'$set': {'payment_id': charge['id']}})
        order = await db.store_orders.find_one({'_id': order['_id']})
    result = await settle_store(order, charge)
    return {'order_id': str(order['_id']), 'payment_status': result['payment_status'], 'mode': 'test',
            'redirect_url': tap_service.checkout_url(charge) if result['payment_status'] == 'pending' else None}


@router.post('/payments/webhook')
async def payment_webhook(request: Request):
    raw = await request.body()
    if len(raw) > 65536:
        raise HTTPException(413, 'حجم الإشعار غير مسموح')
    try:
        event = json.loads(raw)
    except ValueError:
        raise HTTPException(400, 'إشعار غير صالح') from None
    if not tap_service.valid_tap_hash(event, request.headers.get('hashstring'), secret=os.environ.get('TAP_COMMERCE_SECRET_KEY', '')):
        raise HTTPException(400, 'توقيع غير صالح')
    order = await db.store_orders.find_one({'payment_id': event.get('id')})
    if not order:
        raise HTTPException(404, 'الطلب غير موجود')
    validate_store_charge(order, event)
    try:
        await settle_store(order, await tap_commerce.retrieve_charge(order['payment_id']))
    except tap_service.TapError as exc:
        raise HTTPException(exc.status_code, str(exc)) from None
    return {'received': True}


class StatusBody(BaseModel):
    token: SecretStr


@router.post('/orders/{order_id}/status')
async def store_status(order_id: str, body: StatusBody):
    order = await db.store_orders.find_one({'_id': to_oid(order_id)})
    if not order or not hmac.compare_digest(order.get('payment_token', ''), body.token.get_secret_value()):
        raise HTTPException(404, 'الطلب غير موجود')
    if order.get('payment_id'):
        try:
            order = await settle_store(order, await tap_commerce.retrieve_charge(order['payment_id']))
        except tap_service.TapError as exc:
            raise HTTPException(exc.status_code, str(exc)) from None
    return {'status': order['payment_status'], 'total': order['total'], 'currency': order['currency'], 'mode': 'test'}


@router.get('/business')
async def business_summary(user=Depends(get_current_user)):
    account = await db.merchant_accounts.find_one({'owner_id': user['id']})
    business_id = (account or {}).get('tap_business_id')
    if not tap_commerce.valid_id(business_id, 'bus_'):
        raise HTTPException(404, 'بيانات النشاط غير متوفرة بعد')
    try:
        data = await tap_commerce.request('GET', 'v2/business/' + business_id)
    except tap_service.TapError as exc:
        raise HTTPException(exc.status_code, str(exc)) from None
    if data.get('id') != business_id or data.get('object') != 'business' or data.get('live_mode') is not False:
        raise HTTPException(502, 'استجابة النشاط غير صالحة')
    # Explicit projection: operator credentials, bank accounts and identity documents never leave backend.
    return {k: data.get(k) for k in ('id', 'status', 'name', 'type')}
