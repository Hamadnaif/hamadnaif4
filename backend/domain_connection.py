import os
import re
import hashlib
import hmac
import ipaddress
import dns.asyncresolver
import dns.exception
from fastapi import HTTPException


def domain_records(domain, site_id):
    if len(domain) > 253 or not all(re.fullmatch(r'[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?', x) for x in domain.split('.')):
        raise HTTPException(400, 'صيغة النطاق غير صحيحة')
    target = os.environ.get('CUSTOM_DOMAIN_TARGET_IP')
    secret = os.environ.get('JWT_SECRET')
    try:
        ipaddress.IPv4Address(target)
    except (ValueError, TypeError):
        raise HTTPException(503, 'ربط النطاقات قيد التجهيز. لم تُضف أي سجلات DNS.') from None
    if not secret:
        raise HTTPException(503, 'ربط النطاقات قيد التجهيز.')
    token = hmac.new(secret.encode(), f'{site_id}:{domain}'.encode(), hashlib.sha256).hexdigest()
    return domain, [{'type': 'A', 'name': '@', 'value': target, 'note': 'عنوان خادم المنصة'},
                    {'type': 'TXT', 'name': '_manasati', 'value': token, 'note': 'إثبات ملكية النطاق'}]


async def verify_records(site):
    domain, records = domain_records(site['custom_domain'], str(site['_id']))
    try:
        addresses = await dns.asyncresolver.resolve(domain, 'A', lifetime=5)
        ownership = await dns.asyncresolver.resolve(f'_manasati.{domain}', 'TXT', lifetime=5)
        return (records[0]['value'] in {str(a) for a in addresses} and
                records[1]['value'] in {b''.join(t.strings).decode() for t in ownership})
    except (dns.exception.DNSException, UnicodeDecodeError):
        return False
