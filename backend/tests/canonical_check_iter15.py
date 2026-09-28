"""Iteration 15 - Read-only canonical verification of REAL Tap sandbox order.

Reads order 6aba8f756f124f0de3f93fac from DB, performs exactly ONE server-side
Tap retrieve_charge call, validates via payment_orders.validate_charge, and
inspects owner user subscription fields. No mutations, no full response prints.
"""
import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from db import db, to_oid  # noqa: E402
from payment_orders import PaymentOrder, validate_charge  # noqa: E402
import tap_service  # noqa: E402

ORDER_ID = "6aba8f756f124f0de3f93fac"
CANCELLED_IDS = ["6aba8ef36f124f0de3f93faa", "6aba8eae6f124f0de3f93fa8"]


def safe(label, value):
    print(f"  - {label}: {value}")


async def main():
    print("=== ITER15 REAL SANDBOX CANONICAL VERIFICATION (read-only) ===")
    print(f"tap_service.is_configured(): {tap_service.is_configured()}")

    # --- 1. Read the paid order ---
    oid = to_oid(ORDER_ID)
    doc = await db.orders.find_one({"_id": oid})
    if not doc:
        print(f"FAIL: order {ORDER_ID} not found")
        return 1
    order = PaymentOrder.from_mongo(doc)

    print("\n[DB order fields]")
    safe("id", order.id)
    safe("provider", order.provider)
    safe("mode", order.mode)
    safe("plan_name", order.plan_name)
    safe("cycle", order.cycle)
    safe("amount", order.amount)
    safe("currency", order.currency)
    safe("status", order.status)
    safe("gateway_status", order.gateway_status)
    safe("paid_at_present", bool(order.paid_at))
    safe("fulfilled_at_present", bool(order.fulfilled_at))
    safe("payment_id_present", bool(order.payment_id))
    safe("payment_id_prefix_valid", tap_service.valid_charge_id(order.payment_id or ""))

    expectations = {
        "provider=tap": order.provider == "tap",
        "mode=test": order.mode == "test",
        "plan البداية": order.plan_name == "البداية",
        "amount=29": float(order.amount) == 29.0,
        "currency=SAR": order.currency == "SAR",
        "status=paid": order.status == "paid",
        "gateway_status=CAPTURED": order.gateway_status == "CAPTURED",
        "paid_at present": bool(order.paid_at),
        "fulfilled_at present": bool(order.fulfilled_at),
    }
    print("\n[Order expectations]")
    all_ok_order = True
    for k, v in expectations.items():
        print(f"  {'OK ' if v else 'FAIL'} {k}")
        all_ok_order = all_ok_order and v

    # --- 2. Exactly ONE Tap retrieve_charge ---
    print("\n[Tap retrieve_charge - single canonical call]")
    try:
        charge = await tap_service.retrieve_charge(order.payment_id)
    except Exception as e:
        print(f"FAIL: retrieve_charge raised: {type(e).__name__}: {e}")
        return 2

    # Sanitized fields only
    ref = charge.get("reference") or {}
    metadata = charge.get("metadata") or {}
    transaction = charge.get("transaction") or {}
    post = charge.get("post") or {}

    safe("charge.id_matches_payment_id", charge.get("id") == order.payment_id)
    safe("charge.object=='charge'", charge.get("object") == "charge")
    safe("charge.live_mode", charge.get("live_mode"))
    safe("charge.status", charge.get("status"))
    safe("charge.amount", charge.get("amount"))
    safe("charge.currency", charge.get("currency"))
    safe("reference.order_matches", ref.get("order") == order.id)
    safe("reference.transaction_matches", ref.get("transaction") == order.id)
    safe("metadata.order_id_matches", metadata.get("order_id") == order.id)
    safe("metadata.plan_id_matches", metadata.get("plan_id") == order.plan_id)
    safe("transaction.created_present", bool(transaction.get("created")))
    if "status" in post:
        safe("post.status_present", True)
        safe("post.status_value", post.get("status"))
    else:
        safe("post.status_present", False)
        print("  NOTE: provider did not include post.status -> webhook delivery NOT confirmed by provider")

    # --- 3. validate_charge (read-only) ---
    print("\n[validate_charge()]")
    try:
        validate_charge(order, charge)
        canonical_ok = True
        print("  OK validate_charge passed (order/charge canonical match)")
    except Exception as e:
        canonical_ok = False
        print(f"  FAIL validate_charge: {type(e).__name__}: {e}")

    captured_and_test = (charge.get("status") == "CAPTURED"
                         and charge.get("live_mode") is False)
    print(f"  captured_and_test_mode: {captured_and_test}")

    # --- 4. Owner user subscription state ---
    print("\n[Owner user subscription state]")
    owner = await db.users.find_one(
        {"_id": to_oid(order.owner_id)},
        {"plan_id": 1, "subscription_status": 1, "subscription_payment_mode": 1,
         "subscription_payment_order": 1, "subscription_payment_at": 1,
         "subscription_renews_at": 1, "plan_cycle": 1},
    )
    if not owner:
        print("  FAIL: owner user not found")
        return 3

    plan_match = str(owner.get("plan_id")) == str(order.plan_id)
    safe("plan_id_matches_order", plan_match)
    safe("subscription_status", owner.get("subscription_status"))
    safe("subscription_payment_mode", owner.get("subscription_payment_mode"))
    safe("subscription_payment_order_matches", owner.get("subscription_payment_order") == order.id)
    safe("subscription_payment_at_matches_paid_at", owner.get("subscription_payment_at") == order.paid_at)
    safe("plan_cycle_matches", owner.get("plan_cycle") == order.cycle)

    # Expiry consistent with stable paid_at
    from datetime import datetime, timedelta
    expected_days = 365 if order.cycle == "yearly" else 30
    try:
        expected_end = (datetime.fromisoformat(order.paid_at) + timedelta(days=expected_days)).isoformat()
        expiry_ok = owner.get("subscription_renews_at") == expected_end
    except Exception:
        expiry_ok = False
    safe("subscription_renews_at_consistent_with_paid_at", expiry_ok)

    owner_ok = (
        plan_match
        and owner.get("subscription_status") == "active"
        and owner.get("subscription_payment_mode") == "test"
        and owner.get("subscription_payment_order") == order.id
        and expiry_ok
    )

    # --- 5. Cancelled orders sanity ---
    print("\n[Cancelled orders sanity]")
    cancelled_ok = True
    for cid in CANCELLED_IDS:
        cdoc = await db.orders.find_one({"_id": to_oid(cid)}, {"status": 1, "gateway_status": 1, "paid_at": 1, "fulfilled_at": 1})
        if not cdoc:
            print(f"  {cid}: NOT FOUND")
            cancelled_ok = False
            continue
        no_paid = cdoc.get("paid_at") in (None, "") and cdoc.get("fulfilled_at") in (None, "")
        print(f"  {cid}: status={cdoc.get('status')} gateway={cdoc.get('gateway_status')} no_paid_or_fulfilled={no_paid}")
        cancelled_ok = cancelled_ok and no_paid

    # --- Summary ---
    print("\n=== SUMMARY ===")
    print(f"order_fields_ok         : {all_ok_order}")
    print(f"canonical_validate_ok   : {canonical_ok}")
    print(f"captured_and_test_mode  : {captured_and_test}")
    print(f"owner_subscription_ok   : {owner_ok}")
    print(f"cancelled_orders_ok     : {cancelled_ok}")
    print(f"provider_webhook_signal : {'post.status=' + str(post.get('status')) if 'status' in post else 'NOT CONFIRMED (post.status absent)'}")

    overall = all_ok_order and canonical_ok and captured_and_test and owner_ok and cancelled_ok
    print(f"OVERALL                 : {'PASS' if overall else 'FAIL'}")
    return 0 if overall else 10


if __name__ == "__main__":
    code = asyncio.run(main())
    sys.exit(code)
