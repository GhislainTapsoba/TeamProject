from django.urls import path

from .views import (
    CurrentSubscriptionView,
    InitiateCheckoutView,
    PaymentDetailView,
    PaymentListView,
    PlanListView,
    mock_checkout,
    payment_return,
)

urlpatterns = [
    path("plans/", PlanListView.as_view(), name="billing_plans"),
    path("subscription/", CurrentSubscriptionView.as_view(), name="billing_subscription"),
    path("checkout/", InitiateCheckoutView.as_view(), name="billing_checkout"),
    path("payments/", PaymentListView.as_view(), name="billing_payments"),
    path("payments/<str:transaction_id>/", PaymentDetailView.as_view(), name="billing_payment_detail"),
    path("return/", payment_return, name="billing_return"),
    path("mock/<str:transaction_id>/", mock_checkout, name="billing_mock_checkout"),
]
