import os
import sys
from pathlib import Path

import dotenv
from celery.schedules import crontab

from apps.core.security import ensure_no_public_secret_prefixes

BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env file if it exists
dotenv.load_dotenv(BASE_DIR / ".env")
dotenv.load_dotenv(BASE_DIR.parent / ".env")

ensure_no_public_secret_prefixes()

# Sécurisé par défaut : le mode développement doit être demandé explicitement (DEBUG=True en local)
DEBUG = os.getenv("DEBUG", "False").lower() in ("true", "1", "t")

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = "django-insecure-dev-teamproject-local-secret-key-32chars"
    else:
        raise ValueError("SECRET_KEY environment variable is required in production")

# "backend" : nom du service Docker, utilisé par les appels internes
_DEFAULT_HOSTS = "*" if DEBUG else ".deep-technologies.com,.localhost,localhost,backend"
ALLOWED_HOSTS = [h.strip() for h in os.getenv("ALLOWED_HOSTS", _DEFAULT_HOSTS).split(",") if h.strip()]

EMAIL_VERIFICATION_REQUIRED = os.getenv("EMAIL_VERIFICATION_REQUIRED", "True").lower() in ("true", "1", "yes", "on")
SENTRY_DSN = os.getenv("SENTRY_DSN", "")
TURNSTILE_SECRET_KEY = os.getenv("TURNSTILE_SECRET_KEY", "")
TURNSTILE_SITE_KEY = os.getenv("TURNSTILE_SITE_KEY", "")

# Supabase Auth configuration
SUPABASE_URL = (os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL") or "").rstrip("/")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY") or ""
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
# Legacy projects sign JWTs with a shared HS256 secret; newer ones use asymmetric keys (JWKS)
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")
SUPABASE_JWKS_URL = os.getenv("SUPABASE_JWKS_URL") or (
    f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json" if SUPABASE_URL else ""
)
SUPABASE_JWT_AUDIENCE = os.getenv("SUPABASE_JWT_AUDIENCE", "authenticated")
SUPABASE_JWT_ISSUER = os.getenv("SUPABASE_JWT_ISSUER") or (f"{SUPABASE_URL}/auth/v1" if SUPABASE_URL else None)

if SENTRY_DSN:
    try:
        import sentry_sdk
    except ImportError as exc:
        raise RuntimeError("SENTRY_DSN is configured but sentry-sdk is not installed") from exc

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        # Pas de données personnelles (IP, cookies, utilisateur) envoyées à Sentry
        send_default_pii=False,
        traces_sample_rate=0.2,
    )

# Multi-Tenancy Applications
SHARED_APPS = [
    "django_tenants",
    "apps.tenants",
    "apps.billing",
    "apps.accounts",
    "django.contrib.contenttypes",
    "django.contrib.staticfiles",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.sessions",
    "django.contrib.messages",
]

TENANT_APPS = [
    "django.contrib.contenttypes",
    "rest_framework",
    "corsheaders",
    "apps.projects",
    "apps.notifications",
    "apps.core",
]


INSTALLED_APPS = list(SHARED_APPS) + [a for a in TENANT_APPS if a not in SHARED_APPS]

TENANT_MODEL = "tenants.Client"
TENANT_DOMAIN_MODEL = "tenants.Domain"
AUTH_USER_MODEL = "accounts.User"

MIDDLEWARE = [
    "django_tenants.middleware.main.TenantMainMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "apps.core.middleware.SubscriptionCheckMiddleware",
    "apps.tenants.middleware.platform_admin.PlatformAdminBypassMiddleware",
    "apps.core.middleware.ActivityAuditMiddleware",
]

ROOT_URLCONF = "config.urls"
PUBLIC_SCHEMA_URLCONF = "config.urls_public"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# Database with PostgreSQL backend for django-tenants
DATABASES = {
    "default": {
        "ENGINE": "django_tenants.postgresql_backend",
        "NAME": os.getenv("POSTGRES_DB", "teamproject"),
        "USER": os.getenv("POSTGRES_USER", "postgres"),
        "PASSWORD": os.getenv("POSTGRES_PASSWORD", "postgres"),
        "HOST": os.getenv("POSTGRES_HOST", "postgres"),
        "PORT": os.getenv("POSTGRES_PORT", "5432"),
        # Reuse connections between requests instead of reconnecting each time
        "CONN_MAX_AGE": int(os.getenv("DB_CONN_MAX_AGE", "60")),
        "CONN_HEALTH_CHECKS": True,
    }
}

DATABASE_ROUTERS = ("django_tenants.routers.TenantSyncRouter",)

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "fr-fr"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"]

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# REST Framework Settings
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ("apps.core.authentication.SupabaseJWTAuthentication",),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "120/minute",
        "user": "600/minute",
        "auth": "5/minute",
        "registration": "5/hour",
        "platform": "300/minute",
    },
    # Nginx overwrites X-Forwarded-For with the real client IP: trust exactly one proxy hop
    "NUM_PROXIES": int(os.getenv("NUM_PROXIES", "1")),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 50,
}

# CORS Configuration
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https?:\/\/([a-zA-Z0-9-]+\.)?deep-technologies\.com$",
    r"^https?:\/\/([a-zA-Z0-9-]+\.)?localhost(:\d+)?$",
    r"^https?:\/\/127\.0\.0\.1(:\d+)?$",
]
CORS_ALLOW_CREDENTIALS = True

# Redis & Celery
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://redis:6379/0")
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://redis:6379/0")
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE
CELERY_BEAT_SCHEDULE = {
    "billing-check-subscriptions": {
        "task": "apps.billing.tasks.check_subscriptions",
        "schedule": crontab(minute=0),
    },
}

# Shared cache (throttling counters must be shared between Gunicorn workers)
REDIS_CACHE_URL = os.getenv("REDIS_CACHE_URL", "")
if REDIS_CACHE_URL and "pytest" not in sys.modules:
    CACHES = {"default": {"BACKEND": "django.core.cache.backends.redis.RedisCache", "LOCATION": REDIS_CACHE_URL}}

# Platform console (super-admins): optional IP allowlist, comma-separated IPs or CIDRs
PLATFORM_IP_ALLOWLIST = [h.strip() for h in os.getenv("PLATFORM_IP_ALLOWLIST", "").split(",") if h.strip()]

# Billing
# "cinetpay" in production, "mock" to test the payment flow locally (refused when DEBUG is off)
BILLING_PROVIDER = os.getenv("BILLING_PROVIDER", "cinetpay")
# Days of full access after a paid period ends, before going back to the free plan
BILLING_GRACE_DAYS = int(os.getenv("BILLING_GRACE_DAYS", "7"))
# New organizations try the Pro plan for this many days
BILLING_TRIAL_DAYS = int(os.getenv("BILLING_TRIAL_DAYS", "14"))

# CinetPay Configuration
CINETPAY_API_KEY = os.getenv("CINETPAY_API_KEY", "")
CINETPAY_SITE_ID = os.getenv("CINETPAY_SITE_ID", "")
CINETPAY_CHECKOUT_URL = "https://api-checkout.cinetpay.com/v2/payment"
CINETPAY_CHECK_URL = "https://api-checkout.cinetpay.com/v2/payment/check"

# Data Encryption for Tenant Sensitive Credentials (Fernet 32 bytes base64)
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")
if not ENCRYPTION_KEY:
    if DEBUG:
        ENCRYPTION_KEY = "v1rZk5g7qHk_7D4B6T9u8-v2h1j3k4l5m6n7o8p9q0r="
    else:
        raise ValueError("ENCRYPTION_KEY environment variable is required in production")

# Platform URL
PLATFORM_DOMAIN = os.getenv("PLATFORM_DOMAIN", "teamproject.deep-technologies.com")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://teamproject.deep-technologies.com")

# Reverse proxy SSL header & Security Headers
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"

# Production Security Headers (enabled in production)
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
