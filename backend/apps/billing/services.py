import time
import requests
from django.conf import settings

def create_cinetpay_payment(subscription, target_plan, return_url=None):
    """
    Generate payment checkout link through CinetPay API v2.
    Supports Orange Money, Moov Money, and Credit Cards across West/Central Africa (XOF).
    """
    transaction_id = f"sub-{subscription.id}-{subscription.tenant.schema_name}-{int(time.time())}"
    amount = int(target_plan.price_monthly)

    notify_url = f"{settings.FRONTEND_URL}/api/billing/cinetpay/webhook/"
    if not return_url:
        return_url = f"https://{subscription.tenant.schema_name}.{settings.PLATFORM_DOMAIN}/settings/billing"

    payload = {
        "apikey": settings.CINETPAY_API_KEY,
        "site_id": settings.CINETPAY_SITE_ID,
        "transaction_id": transaction_id,
        "amount": amount,
        "currency": "XOF",
        "description": f"Abonnement {target_plan.display_name or target_plan.name} — {subscription.tenant.name}",
        "notify_url": notify_url,
        "return_url": return_url,
        "channels": "ALL",
        "metadata": f"{target_plan.id}",
    }

    try:
        response = requests.post(
            settings.CINETPAY_CHECKOUT_URL,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=15
        )
        res_data = response.json()
        return {
            'success': res_data.get('code') == '201',
            'transaction_id': transaction_id,
            'payment_url': res_data.get('data', {}).get('payment_url'),
            'payment_token': res_data.get('data', {}).get('payment_token'),
            'raw': res_data,
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def verify_cinetpay_transaction(transaction_id):
    """
    Verify payment directly with CinetPay API check endpoint.
    NEVER trust incoming webhook without server-side re-verification!
    """
    try:
        payload = {
            "apikey": settings.CINETPAY_API_KEY,
            "site_id": settings.CINETPAY_SITE_ID,
            "transaction_id": transaction_id,
        }
        response = requests.post(
            settings.CINETPAY_CHECK_URL,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=15
        )
        res_data = response.json()
        return res_data
    except Exception as e:
        return {'status': 'ERROR', 'message': str(e)}
