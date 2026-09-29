"""Tap Commerce Platform adapter. Test-only until production approval/configuration.
Connect callbacks use a per-account random capability shared only with Tap over TLS.
Never persist webhook operator.api_credentials or merchant identity documents.
"""
import os
import re
import httpx
from urllib.parse import urlsplit
from tap_service import TapError, checkout_url


def is_configured():
    return bool(os.environ.get('TAP_COMMERCE_ENABLED') == 'true'
                and os.environ.get('TAP_COMMERCE_SECRET_KEY', '').startswith('sk_test_')
                and os.environ.get('TAP_PLATFORM_ID', '').startswith('commerce_platform_')
                and urlsplit(os.environ.get('PUBLIC_APP_URL', '')).scheme == 'https')


def valid_id(value, prefix):
    return isinstance(value, str) and bool(re.fullmatch(prefix + r'[A-Za-z0-9_-]{1,160}', value))


async def request(method, path, body=None):
    if not is_configured():
        raise TapError('تفعيل مدفوعات المتاجر متوقف حتى استكمال إعدادات Tap للمنصة.', 503)
    try:
        async with httpx.AsyncClient(timeout=25) as client:
            response = await client.request(method, 'https://api.tap.company/' + path,
                json=body, headers={'Authorization': 'Bearer ' + os.environ['TAP_COMMERCE_SECRET_KEY'],
                                    'accept': 'application/json'})
        if response.is_error:
            raise TapError('تعذّر إكمال الطلب لدى Tap. راجع بيانات التفعيل أو حاول لاحقًا.')
        data = response.json()
        if not isinstance(data, dict) or data.get('live_mode') is True:
            raise TapError('استجابة غير صالحة لوضع اختبار Tap.')
        return data
    except (httpx.HTTPError, ValueError):
        raise TapError('تعذّر الاتصال بـ Tap. أعد التحقق قبل إنشاء طلب جديد.') from None


def app_url():
    return os.environ['PUBLIC_APP_URL'].rstrip('/')


def callback_url(account):
    return f"{app_url()}/api/commerce/connect/webhook/{account['_id']}/{account['callback_token']}"


async def create_lead(account, body, user):
    payload = {
        'country': 'SA',
        'brand': {'name': [{'lang': 'ar', 'text': body.brand_name}]},
        'users': [{'name': [{'lang': 'ar', 'first': body.first_name, 'last': body.last_name}],
                   'contact': {'email': [{'address': user['email'], 'primary': True}],
                               'phone': [{'country_code': '966', 'number': body.phone, 'primary': True}]},
                   'identification': {'type': body.identification_type, 'number': body.identification_number,
                                      'country': 'SA', 'nationality': body.nationality}, 'primary': True}],
        'merchant': {'platforms': [{'id': os.environ['TAP_PLATFORM_ID']}]},
        'metadata': {'manasati_account': str(account['_id'])},
        'post': {'url': callback_url(account)},
    }
    data = await request('POST', 'v3/lead/', payload)
    if not valid_id(data.get('id'), 'led_'):
        raise TapError('لم ترجع Tap مرجع تفعيل صالحًا.')
    return data['id']


async def connect(account):
    data = await request('POST', 'v3/connect/', {
        'scope': 'merchant', 'lead': {'id': account['tap_lead_id']},
        'data': ['operation', 'brand', 'entity', 'merchant'],
        'board': {'editable': True, 'display': True},
        'interface': {'locale': 'ar', 'direction': 'rtl', 'edges': 'curved'},
        'redirect': {'url': app_url() + '/dashboard/payments'},
        'post': {'url': callback_url(account)}, 'webhook': {'url': callback_url(account)},
    })
    # Reuse the strict Tap-owned HTTPS hostname validator.
    return checkout_url({'transaction': {'url': (data.get('connect') or {}).get('url')}})


async def create_store_charge(order):
    oid = str(order['_id'])
    data = await request('POST', 'v2/charges/', {
        'amount': order['total'], 'currency': 'SAR', 'customer_initiated': True,
        'threeDSecure': True, 'save_card': False, 'description': 'طلب متجر — اختبار',
        'merchant': {'id': order['tap_merchant_id']}, 'platform': {'id': order['tap_platform_id']},
        'metadata': {'store_order_id': oid},
        'reference': {'order': oid, 'transaction': oid, 'idempotent': oid},
        'customer': {'first_name': order['customer_name'], 'email': order['email']},
        'source': {'id': 'src_all'},
        'post': {'url': app_url() + '/api/commerce/payments/webhook'},
        'redirect': {'url': f"{app_url()}/store-payment/{oid}#token={order['payment_token']}"},
    })
    if not valid_id(data.get('id'), 'chg_') or data.get('live_mode') is not False:
        raise TapError('استجابة الدفع لا تطابق وضع الاختبار.')
    return data


async def retrieve_charge(charge_id):
    if not valid_id(charge_id, 'chg_'):
        raise TapError('مرجع الدفع غير صالح.', 400)
    return await request('GET', 'v2/charges/' + charge_id)
