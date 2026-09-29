"""Isolated acceptance/regression tests: no real payments, mail or production DB."""
import os
import sys
import json
import hashlib
import hmac
import uuid
from pathlib import Path
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock

os.environ.setdefault('MONGO_URL', 'mongodb://127.0.0.1:27017')
os.environ.setdefault('DB_NAME', 'manasati_test_only')
os.environ.setdefault('JWT_SECRET', 'isolated-test-secret-at-least-32-characters')
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import pytest
import pytest_asyncio
import httpx
from bson import ObjectId
from mongomock_motor import AsyncMongoMockClient
import db as dbmod
import auth
import seed
import payment_orders
import tap_service
import tap_commerce
import storage_quota
from routers import account, sites, public, payments, commerce, admin, media, ai, payouts
from server import app
from subscriptions import has_paid_access
from domain_connection import domain_records

pytestmark = pytest.mark.asyncio(loop_scope='module')


@pytest_asyncio.fixture(loop_scope='module')
async def env(monkeypatch):
    database = AsyncMongoMockClient()['test']
    for module in (dbmod, auth, seed, payment_orders, storage_quota, account, sites, public, payments, commerce, admin, media, ai, payouts):
        monkeypatch.setattr(module, 'db', database)
    for key in ('TAP_COMMERCE_ENABLED','TAP_COMMERCE_SECRET_KEY','TAP_PLATFORM_ID','CUSTOM_DOMAIN_TARGET_IP','ADMIN_EMAIL','ADMIN_PASSWORD'):
        monkeypatch.delenv(key, raising=False)
    monkeypatch.setattr(public, 'send_contact_notification', AsyncMock())
    await seed.run_seed()
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='https://test.local') as client:
        r = await client.post('/api/auth/register', json={'name':'Test Owner','email':'owner@example.com','password':'Testpass123'})
        assert r.status_code == 200, r.text
        yield database, client, r.json(), monkeypatch


async def make_site(env):
    db, c, user, _ = env
    tpl = (await c.get('/api/public/templates')).json()[0]
    r = await c.post('/api/sites', json={'name':'متجر اختبار','template_id':tpl['id']})
    assert r.status_code == 200, r.text
    return r.json()


def enable_commerce(monkeypatch):
    monkeypatch.setenv('TAP_COMMERCE_ENABLED','true')
    monkeypatch.setenv('TAP_COMMERCE_SECRET_KEY','sk_test_isolated')
    monkeypatch.setenv('TAP_PLATFORM_ID','commerce_platform_test')
    monkeypatch.setenv('PUBLIC_APP_URL','https://test.local')


def store_pages(price=25):
    return [{'id':'home','title':'الرئيسية','sections':[{'id':'shop','type':'store','data':{
        'currency':'SAR','products':[{'name':'منتج','price':price}]}}]}]


async def store(env):
    db,c,user,m=env
    s=await make_site(env)
    await c.put('/api/sites/'+s['id'],json={'pages':store_pages()})
    await c.post('/api/sites/'+s['id']+'/publish')
    return s


def cart(**extra):
    return {'customer_name':'عميل اختبار','phone':'0500000000','items':[{'product_ref':'shop:0','qty':2,'name':'منتج','price':0.01}],
            'total':0.02,'request_id':str(uuid.uuid4()), **extra}


async def test_registration_login_and_admin_isolation(env):
    db,c,u,m=env
    assert await db.users.count_documents({'role':'admin'}) == 0
    assert (await c.get('/api/admin/settings')).status_code == 403
    await c.post('/api/auth/logout')
    assert (await c.get('/api/sites')).status_code == 401
    assert (await c.post('/api/auth/login',json={'email':'owner@example.com','password':'wrong'})).status_code == 401
    assert (await c.post('/api/auth/login',json={'email':'owner@example.com','password':'Testpass123'})).status_code == 200


async def test_draft_publish_edit_republish_and_unpublish(env):
    db,c,u,m=env
    s=await make_site(env)
    url='/api/public/site/'+s['subdomain']
    assert (await c.get(url)).status_code == 404
    await c.post('/api/sites/'+s['id']+'/publish')
    await c.put('/api/sites/'+s['id'],json={'name':'مسودة جديدة'})
    published=(await c.get(url)).json()
    assert published['name']=='متجر اختبار'
    assert 'owner_id' not in published and 'published_snapshot' not in published
    await c.post('/api/sites/'+s['id']+'/publish')
    assert (await c.get(url)).json()['name']=='مسودة جديدة'
    await c.post('/api/sites/'+s['id']+'/unpublish')
    assert (await c.get(url)).status_code == 404


async def test_site_and_order_tenant_isolation(env):
    db,c,u,m=env
    s=await make_site(env)
    await c.post('/api/auth/register',json={'name':'Other','email':'other@example.com','password':'Password123'})
    assert (await c.get('/api/sites/'+s['id'])).status_code == 403
    assert (await c.put('/api/sites/'+s['id'],json={'name':'hijack'})).status_code == 403
    assert (await c.get('/api/account/store-orders')).json()==[]


async def test_expired_entitlements_and_free_creation_count(env):
    db,c,u,m=env
    plan=await db.plans.find_one({'price_monthly':79})
    await db.users.update_one({'_id':ObjectId(u['id'])},{'$set':{'plan_id':str(plan['_id']),'subscription_status':'active','subscription_renews_at':(datetime.now(timezone.utc)-timedelta(days=1)).isoformat()}})
    assert (await c.get('/api/account/overview')).json()['subscription_status']=='expired'
    s=await make_site(env)
    user=await db.users.find_one({'_id':ObjectId(u['id'])})
    assert user['sites_created']==1 and not has_paid_access(user)
    assert (await c.post('/api/sites/'+s['id']+'/domain',json={'custom_domain':'example.com'})).status_code == 403


async def test_server_prices_and_idempotent_store_order(env):
    db,c,u,m=env
    s=await store(env)
    payload=cart()
    url='/api/public/site/'+s['subdomain']+'/order'
    one=await c.post(url,json=payload);two=await c.post(url,json=payload)
    assert one.status_code==200,one.text
    assert one.json()['total']==50 and one.json()['order_id']==two.json()['order_id']
    assert await db.store_orders.count_documents({})==1
    payload['items'][0]['qty']=0
    assert (await c.post(url,json=payload)).status_code==422
    payload['items'][0]['qty']=3
    assert (await c.post(url,json=payload)).status_code==409


async def test_store_uses_published_prices(env):
    db,c,u,m=env
    s=await store(env)
    await c.put('/api/sites/'+s['id'],json={'pages':store_pages(999)})
    result=await c.post('/api/public/site/'+s['subdomain']+'/order',json=cart())
    assert result.json()['total']==50


async def test_checkout_disabled_until_tap_acceptance(env):
    db,c,u,m=env
    s=await store(env);enable_commerce(m)
    await db.merchant_accounts.insert_one({'owner_id':u['id'],'tap_merchant_id':'merchant_test','is_acceptance_allowed':False})
    r=await c.post('/api/public/site/'+s['subdomain']+'/order',json=cart(payment_method='tap',email='buyer@example.com'))
    assert r.status_code==503 and await db.store_orders.count_documents({})==0


async def test_onboarding_callback_cannot_fake_acceptance(env):
    db,c,u,m=env
    enable_commerce(m)
    body={'brand_name':'تجارة اختبار','first_name':'حمد','last_name':'العتيبي','phone':'500000000','identification_number':'1000000000','consent':True}
    m.setattr(tap_commerce,'create_lead',AsyncMock(return_value='led_test'))
    m.setattr(tap_commerce,'connect',AsyncMock(return_value='https://checkout.tap.company/connect'))
    response=await c.post('/api/commerce/connect',json=body)
    assert response.status_code==200,response.text
    acc=await db.merchant_accounts.find_one({'owner_id':u['id']})
    assert 'identification_number' not in acc and 'callback_token' not in response.json()
    prefix='/api/commerce/connect/webhook/'+str(acc['_id'])+'/'
    event={'object':'merchant','id':'merchant_test','live_mode':False,'created':1,'platforms':[{'id':'commerce_platform_test'}],'is_acceptance_allowed':True,'operator':{'api_credentials':{'secret':'must-not-store'}}}
    assert (await c.post(prefix+'wrong',json=event)).status_code==404
    assert (await c.post(prefix+acc['callback_token'],json=event)).status_code==200
    saved=await db.merchant_accounts.find_one({'_id':acc['_id']})
    assert saved['is_acceptance_allowed'] is True and 'operator' not in saved
    assert (await c.get('/api/commerce/account')).json()['tap_merchant_id']=='merchant_test'
    event['id']='merchant_someone_else'
    assert (await c.post(prefix+acc['callback_token'],json=event)).status_code==409


async def test_uncertain_lead_creation_not_repeated(env):
    db,c,u,m=env
    enable_commerce(m)
    create=AsyncMock(side_effect=tap_service.TapError('timeout'))
    m.setattr(tap_commerce,'create_lead',create)
    body={'brand_name':'متجر','first_name':'حمد','last_name':'نايف','phone':'500000000','identification_number':'1000000000','consent':True}
    assert (await c.post('/api/commerce/connect',json=body)).status_code==502
    assert (await c.post('/api/commerce/connect',json=body)).status_code==409
    assert create.await_count==1


def charge_for(order,status='CAPTURED'):
    oid=str(order['_id'])
    return {'id':'chg_store_test','object':'charge','live_mode':False,'amount':order['total'],'currency':'SAR','status':status,
            'reference':{'order':oid,'transaction':oid},'metadata':{'store_order_id':oid},
            'merchant':{'id':'merchant_test'},'platform':{'id':'commerce_platform_test'},'transaction':{'url':'https://checkout.tap.company/pay','created':1}}


async def test_store_payment_start_settle_duplicate_and_status_privacy(env):
    db,c,u,m=env
    s=await store(env);enable_commerce(m)
    await db.merchant_accounts.insert_one({'owner_id':u['id'],'tap_merchant_id':'merchant_test','is_acceptance_allowed':True})
    m.setattr(tap_commerce,'create_store_charge',AsyncMock(side_effect=lambda o:charge_for(o,'INITIATED')))
    payload=cart(payment_method='tap',email='buyer@example.com')
    r=await c.post('/api/public/site/'+s['subdomain']+'/order',json=payload)
    assert r.status_code==200,r.text
    order=await db.store_orders.find_one({})
    m.setattr(tap_commerce,'retrieve_charge',AsyncMock(return_value=charge_for(order)))
    status='/api/commerce/orders/'+str(order['_id'])+'/status'
    assert (await c.post(status,json={'token':'wrong'})).status_code==404
    for _ in range(2):
        assert (await c.post(status,json={'token':order['payment_token']})).json()['status']=='paid'
    m.setattr(tap_commerce,'retrieve_charge',AsyncMock(return_value=charge_for(order,'FAILED')))
    assert (await c.post(status,json={'token':order['payment_token']})).json()['status']=='paid'
    assert await db.store_orders.count_documents({})==1
    assert 'payment_token' not in (await c.get('/api/account/store-orders')).json()[0]


async def test_store_amount_and_merchant_tampering_rejected(env):
    order={'_id':ObjectId(),'payment_id':'chg_store_test','total':50,'tap_merchant_id':'merchant_test','tap_platform_id':'commerce_platform_test'}
    for key,value in [('amount',1),('merchant',{'id':'merchant_other'}),('platform',{'id':'other'}),('live_mode',True)]:
        event=charge_for(order);event[key]=value
        with pytest.raises(Exception) as exc:
            commerce.validate_store_charge(order,event)
        assert exc.value.status_code==409


async def test_forged_payment_webhook_rejected_without_upstream(env):
    db,c,u,m=env
    retrieve=AsyncMock();m.setattr(tap_commerce,'retrieve_charge',retrieve)
    assert (await c.post('/api/commerce/payments/webhook',json={'id':'chg_fake'},headers={'hashstring':'fake'})).status_code==400
    assert retrieve.await_count==0


async def test_subscription_settlement_idempotency(env):
    db,c,u,m=env
    plan=await db.plans.find_one({})
    order=payment_orders.PaymentOrder(owner_id=u['id'],plan_id=str(plan['_id']),plan_name=plan['name'],cycle='monthly',amount=29,currency='SAR',request_id=str(uuid.uuid4()),payment_id='chg_sub_test')
    await db.orders.insert_one(order.to_mongo())
    charge={'id':order.payment_id,'object':'charge','live_mode':False,'amount':29,'currency':'SAR','status':'CAPTURED','reference':{'order':order.id,'transaction':order.id},'metadata':{'order_id':order.id,'plan_id':order.plan_id}}
    result=await payment_orders.settle(order,charge)
    end=(await db.users.find_one({'_id':ObjectId(u['id'])}))['subscription_renews_at']
    assert result['activated']
    await payment_orders.settle(order,charge)
    assert (await db.users.find_one({'_id':ObjectId(u['id'])}))['subscription_renews_at']==end
    charge['amount']=1
    with pytest.raises(Exception) as exc: await payment_orders.settle(order,charge)
    assert exc.value.status_code==409


async def test_domain_configuration_and_ownership_record(env):
    db,c,u,m=env
    with pytest.raises(Exception) as exc: domain_records('example.com','site')
    assert exc.value.status_code==503
    m.setenv('CUSTOM_DOMAIN_TARGET_IP','192.0.2.10')
    domain,records=domain_records('example.com','site')
    assert records[0]['value']=='192.0.2.10'
    assert records[1]['value']!=domain_records(domain,'another-site')[1][1]['value']
    with pytest.raises(Exception): domain_records('bad..example.com','site')


async def test_storage_quota_and_media_headers(env):
    db,c,u,m=env
    await db.users.update_one({'_id':ObjectId(u['id'])},{'$set':{'storage_used':200*1024*1024}})
    r=await c.post('/api/media',files={'file':('x.svg',b'<svg/>','image/svg+xml')})
    assert r.status_code==403
    await db.users.update_one({'_id':ObjectId(u['id'])},{'$set':{'storage_used':0}})
    r=await c.post('/api/media',files={'file':('x.svg',b'<svg/>','image/svg+xml')})
    assert r.status_code==200,r.text
    served=await c.get(r.json()['url'])
    assert served.headers['content-security-policy'].startswith('sandbox')
    assert (await c.delete('/api/media/'+r.json()['id'])).status_code==200
    assert (await db.users.find_one({'_id':ObjectId(u['id'])}))['storage_used']==0


async def test_payout_filter_download_and_webhook_gate(env):
    db,c,u,m=env
    await db.merchant_accounts.insert_one({'owner_id':u['id'],'tap_legacy_merchant_id':'123'})
    remote={'live_mode':False,'payouts':[{'id':'payout_own','merchant_id':'123','amount':50,'currency':'SAR','status':'PAID_OUT','date':1000,'wallet':{'bank':{'beneficiary':{'iban':'DO_NOT_STORE'}}}}, {'id':'payout_other','merchant_id':'999','amount':70}],'has_more':True}
    provider=AsyncMock(return_value=remote);m.setattr(payouts,'provider',provider)
    r=await c.post('/api/payouts/sync',json={'date_from':0,'date_to':2000})
    assert r.status_code==200,r.text
    assert [p['id'] for p in r.json()['payouts']]==['payout_own']
    assert 'wallet' not in r.json()['payouts'][0]
    assert (await c.get('/api/payouts/payout_other/download')).status_code==404
    provider.return_value=b'zip-test-bytes'
    r=await c.get('/api/payouts/payout_own/download')
    assert r.status_code==200 and r.headers['content-type']=='application/zip'
    assert (await c.post('/api/payouts/webhook',json=remote)).status_code==503
    assert await db.payouts.count_documents({})==1


async def test_business_projection_never_exposes_credentials(env):
    db,c,u,m=env
    await db.merchant_accounts.insert_one({'owner_id':u['id'],'tap_business_id':'bus_test'})
    m.setattr(tap_commerce,'request',AsyncMock(return_value={'id':'bus_test','object':'business','live_mode':False,'status':'Active','name':{'ar':'نشاط'},'type':'corp','entity':{'operator':{'api_credentials':{'secret':'must-not-expose'}}}}))
    r=await c.get('/api/commerce/business')
    assert r.status_code==200
    assert set(r.json())=={'id','status','name','type'}


async def test_connect_request_matches_documented_contract(env):
    db,c,u,m=env
    enable_commerce(m)
    request=AsyncMock(return_value={'connect':{'url':'https://url-shortner.dev.tap.company/test'},'lead':{'id':'led_test'}})
    m.setattr(tap_commerce,'request',request)
    account={'_id':ObjectId(),'tap_lead_id':'led_test','callback_token':'server-only'}
    assert await tap_commerce.connect(account)=='https://url-shortner.dev.tap.company/test'
    args=request.await_args.args
    assert args[0:2]==('POST','v3/connect/')
    assert args[2]['scope']=='merchant' and args[2]['lead']=={'id':'led_test'}
    assert args[2]['interface']['locale']=='ar' and args[2]['interface']['direction']=='rtl'
    assert args[2]['post']['url']==args[2]['webhook']['url']


async def test_contact_and_ai_unavailable_are_explicit(env):
    db,c,u,m=env
    s=await make_site(env)
    await c.post('/api/sites/'+s['id']+'/publish')
    r=await c.post('/api/public/site/'+s['subdomain']+'/contact',json={'name':'Visitor','email':'visitor@example.com','message':'test'})
    assert r.status_code==200 and await db.contact_submissions.count_documents({'owner_id':u['id']})==1
    m.delenv('EMERGENT_LLM_KEY',raising=False)
    assert (await c.post('/api/ai/generate',json={'kind':'hero','context':'test'})).status_code==503


async def test_concurrent_free_site_creation_cannot_exceed_quota(env):
    import asyncio
    db,c,u,m=env
    tpl=(await c.get('/api/public/templates')).json()[0]
    results=await asyncio.gather(*[c.post('/api/sites',json={'name':'موقع','template_id':tpl['id']}) for _ in range(3)])
    assert sum(r.status_code==200 for r in results)==1
    assert await db.sites.count_documents({'owner_id':u['id']})==1


async def test_ai_config_cannot_bypass_page_quota(env):
    db,c,u,m=env
    r=await c.post('/api/sites/from-ai',json={'name':'test','config':{'pages':[{'id':str(i)} for i in range(6)]}})
    assert r.status_code==422 and await db.sites.count_documents({})==0


async def test_valid_signed_store_webhook_settles_once(env):
    db,c,u,m=env
    enable_commerce(m)
    order={'_id':ObjectId(),'owner_id':u['id'],'payment_id':'chg_store_test','total':50,'tap_merchant_id':'merchant_test','tap_platform_id':'commerce_platform_test','payment_status':'pending'}
    await db.store_orders.insert_one(order)
    charge=charge_for(order)
    material=f"x_id{charge['id']}x_amount50.00x_currencySARx_gateway_referencex_payment_referencex_statusCAPTUREDx_created1"
    signature=hmac.new(b'sk_test_isolated',material.encode(),hashlib.sha256).hexdigest()
    m.setattr(tap_commerce,'retrieve_charge',AsyncMock(return_value=charge))
    for _ in range(2):
        r=await c.post('/api/commerce/payments/webhook',json=charge,headers={'hashstring':signature})
        assert r.status_code==200,r.text
    assert (await db.store_orders.find_one({'_id':order['_id']}))['payment_status']=='paid'


async def test_failed_subscription_does_not_activate(env):
    db,c,u,m=env
    p=await db.plans.find_one({})
    order=payment_orders.PaymentOrder(owner_id=u['id'],plan_id=str(p['_id']),plan_name=p['name'],cycle='monthly',amount=29,currency='SAR',request_id=str(uuid.uuid4()),payment_id='chg_failed')
    await db.orders.insert_one(order.to_mongo())
    charge={'id':order.payment_id,'object':'charge','live_mode':False,'amount':29,'currency':'SAR','status':'CANCELLED','reference':{'order':order.id,'transaction':order.id},'metadata':{'order_id':order.id,'plan_id':order.plan_id}}
    r=await payment_orders.settle(order,charge)
    assert r['status']=='cancelled' and not r['activated']
    assert (await db.users.find_one({'_id':ObjectId(u['id'])}))['plan_id'] is None


async def test_cross_origin_cookie_write_is_rejected(env):
    db,c,u,m=env
    r=await c.post('/api/commerce/connect/resume',json={},headers={'origin':'https://attacker.invalid'})
    assert r.status_code==403
    assert (await c.get('/api/commerce/account')).headers['cache-control']=='no-store'
