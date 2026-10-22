from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ChangePasswordView,
    CurrentUserProfileView,
    UserViewSet,
)

router = DefaultRouter()
router.register(r"users", UserViewSet, basename="user")

urlpatterns = [
    path("me/", CurrentUserProfileView.as_view(), name="current_user"),
    path("change-password/", ChangePasswordView.as_view(), name="change_password"),
    path("", include(router.urls)),
]
