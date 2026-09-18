from django.urls import path
from .views import CinetPayWebhookView

urlpatterns = [
    path('cinetpay/webhook/', CinetPayWebhookView.as_view(), name='cinetpay_webhook'),
]
