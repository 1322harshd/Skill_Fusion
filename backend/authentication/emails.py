from django.conf import settings
from django.core.mail import send_mail

from .tokens import make_uid_token


def send_verification_email(user):
    token = make_uid_token(user)
    link = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    send_mail(
        subject="Verify your SkillFusion email",
        message=f"Confirm your email by visiting: {link}",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
    )


def send_password_reset_email(user):
    token = make_uid_token(user)
    link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    send_mail(
        subject="Reset your SkillFusion password",
        message=f"Reset your password by visiting: {link}",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
    )
