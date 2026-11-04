from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode

from .models import User


def make_uid_token(user):
    """Builds a single string combining the user's base64-encoded pk and a
    Django password-reset-style token, for use in email verification/reset links."""
    uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    return f"{uidb64}.{token}"


def resolve_uid_token(combined):
    """Reverses make_uid_token: splits out the uid and token, looks up the user,
    and validates the token against them. Returns None on any failure (bad format,
    unknown user, expired/invalid token) rather than raising."""
    try:
        uidb64, token = combined.split(".", 1)
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except (ValueError, TypeError, User.DoesNotExist):
        return None

    if not default_token_generator.check_token(user, token):
        return None

    return user
