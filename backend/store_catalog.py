from decimal import Decimal, InvalidOperation
from fastapi import HTTPException
from publishing import published_content


def price_cart(site, items):
    catalog = {}
    names = {}
    for page in published_content(site).get('pages') or []:
        for section in page.get('sections', []):
            if section.get('type') != 'store':
                continue
            data = section.get('data', {})
            for index, product in enumerate(data.get('products', [])):
                ref = f"{section['id']}:{index}"
                catalog[ref] = {**product, 'currency': data.get('currency', 'SAR')}
                names.setdefault(product.get('name'), []).append(ref)
    result, total, seen = [], Decimal('0'), set()
    for item in items:
        ref = item.product_ref
        if not ref:
            choices = names.get(item.name, [])
            if len(choices) != 1:
                raise HTTPException(409, 'حدّث صفحة المتجر وأعد اختيار المنتجات.')
            ref = choices[0]
        product = catalog.get(ref)
        if not product or ref in seen or product.get('currency') != 'SAR':
            raise HTTPException(422, 'منتج غير صالح أو عملة غير مدعومة.')
        seen.add(ref)
        try:
            price = Decimal(str(product.get('price')))
            if not price.is_finite() or price <= 0 or price > 1000000 or price != price.quantize(Decimal('.01')):
                raise ValueError()
        except (InvalidOperation, ValueError):
            raise HTTPException(422, 'سعر المنتج غير صالح. تواصل مع المتجر.') from None
        total += price * item.qty
        result.append({'product_ref': ref, 'name': product['name'], 'price': float(price), 'qty': item.qty})
    if not result or total > 1000000:
        raise HTTPException(422, 'السلة فارغة أو تجاوزت الحد المسموح.')
    return result, float(total)
