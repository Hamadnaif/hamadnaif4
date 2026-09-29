"""Single entitlement policy, also used for accounts loaded outside auth."""
from datetime import datetime, timezone


def subscription_state(user):
    state = user.get('subscription_status', 'none')
    if state not in {'active', 'cancel_at_period_end'}:
        return state
    try:
        end = datetime.fromisoformat(user['subscription_renews_at'])
        if end.tzinfo is None:
            end = end.replace(tzinfo=timezone.utc)
        return state if end > datetime.now(timezone.utc) else 'expired'
    except (KeyError, TypeError, ValueError):
        return 'expired'


def has_paid_access(user):
    return bool(user.get('plan_id') and subscription_state(user) in {'active', 'cancel_at_period_end'})
