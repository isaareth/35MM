"""
Django settings for the 35mm backend.

Every environment-dependent value comes from an environment variable
(see .env.example) — no separate dev/prod settings modules. Locally,
values are read from a .env file at the project root via django-environ.
"""

from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(
    DJANGO_DEBUG=(bool, False),
)
environ.Env.read_env(BASE_DIR / ".env")

SECRET_KEY = env("DJANGO_SECRET_KEY", default="django-insecure-dev-only-change-me")
DEBUG = env("DJANGO_DEBUG")
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])

# Railway (and most PaaS) terminate TLS at a proxy and forward plain HTTP to
# the app, so Django needs to trust the proxy's header to know a request was
# actually HTTPS — otherwise SECURE_SSL_REDIRECT and CSRF's origin check both
# misbehave behind the proxy.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# Explicit env var rather than deriving from ALLOWED_HOSTS, so a formatting
# slip in one (extra space, missing host) can't silently break the other.
# Always includes every ALLOWED_HOSTS entry as a fallback so the admin login
# keeps working even if CSRF_TRUSTED_ORIGINS itself is never set.
CSRF_TRUSTED_ORIGINS = list(
    dict.fromkeys(
        env.list("CSRF_TRUSTED_ORIGINS", default=[])
        + [f"https://{host.strip()}" for host in ALLOWED_HOSTS if host.strip() not in ("localhost", "127.0.0.1", "")]
    )
)

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework.authtoken",
    "corsheaders",
    "registrations",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
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

# Database
# Falls back to local SQLite when DATABASE_URL is not set, so `manage.py
# runserver` works out of the box without a Supabase project.
DATABASES = {
    "default": env.db(
        "DATABASE_URL", default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}"
    )
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "es"
TIME_ZONE = "America/Bogota"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# CORS — must name the frontend explicitly; never CORS_ALLOW_ALL_ORIGINS in prod.
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=["http://localhost:3050"])

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ],
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "5/hour",
    },
}

if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 60 * 60 * 24 * 7
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "WARNING"},
    "loggers": {
        "registrations": {"handlers": ["console"], "level": "INFO", "propagate": False},
    },
}

# --- 35mm-specific configuration ---
EMAIL_PROVIDER = env("EMAIL_PROVIDER", default="console")  # console | resend
RESEND_API_KEY = env("EMAIL_API_KEY", default="")
EMAIL_FROM_ADDRESS = env("EMAIL_FROM_ADDRESS", default="no-reply@35mm.example.com")
FESTIVAL_CONTACT_EMAIL = env("FESTIVAL_CONTACT_EMAIL", default="35mm@eafit.edu.co")
SHORTFILM_FORM_URL = env("SHORTFILM_FORM_URL", default="")
