from fastapi import HTTPException
from pymongo import ReturnDocument
from db import db, to_oid
from subscriptions import has_paid_access


async def reserve_storage(user, size):
    quota_mb = 200
    if has_paid_access(user):
        plan = await db.plans.find_one({'_id': to_oid(user['plan_id'])})
        quota_mb = (plan or {}).get('limits', {}).get('storage_mb', 200)
    quota = int(quota_mb * 1024 * 1024)
    uid = to_oid(user['id'])
    if not await db.users.find_one({'_id': uid, 'storage_used': {'$exists': True}}):
        usage = await db.media.aggregate([{'$match': {'owner_id': user['id']}}, {'$group': {'_id': None, 'bytes': {'$sum': '$size'}}}]).to_list(1)
        await db.users.update_one({'_id': uid, 'storage_used': {'$exists': False}}, {'$set': {'storage_used': usage[0]['bytes'] if usage else 0}})
    claimed = await db.users.find_one_and_update({'_id': uid, 'storage_used': {'$lte': quota - size}},
        {'$inc': {'storage_used': size}}, return_document=ReturnDocument.AFTER)
    if not claimed:
        raise HTTPException(403, 'تجاوزت مساحة التخزين المتاحة في باقتك. احذف صورًا أو رقّ باقتك.')


async def release_storage(user_id, size):
    await db.users.update_one({'_id': to_oid(user_id), 'storage_used': {'$gte': size}}, {'$inc': {'storage_used': -size}})
