from django.urls import path
from .views import PlanListView, CurrentSubscriptionView, InitiateCheckoutView

urlpatterns = [
    path('plans/', PlanListView.as_view(), name='billing_plans'),
    path('subscription/', CurrentSubscriptionView.as_view(), name='billing_subscription'),
    path('checkout/', InitiateCheckoutView.as_view(), name='billing_checkout'),
]
