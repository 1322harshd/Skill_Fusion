from django.conf import settings
from django.core.mail import send_mail

from .tokens import make_uid_token


def send_verification_email(user):
    """Emails the user a link containing their uid+token, which the frontend
    sends back to the verify-email endpoint to confirm their address."""
    token = make_uid_token(user)
    # The frontend is a hash-routed SPA, so deep links must live after the "#".
    link = f"{settings.FRONTEND_URL}/#/verify-email?token={token}"
    send_mail(
        subject="Verify your SkillFusion email",
        message=f"Confirm your email by visiting: {link}",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
    )


def send_password_reset_email(user):
    """Same idea as send_verification_email, but the link lands on the reset-password
    screen so the token can be exchanged for a new password instead."""
    token = make_uid_token(user)
    link = f"{settings.FRONTEND_URL}/#/reset-password?token={token}"
    send_mail(
        subject="Reset your SkillFusion password",
        message=f"Reset your password by visiting: {link}",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
    )
