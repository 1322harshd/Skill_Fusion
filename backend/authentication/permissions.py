from rest_framework.permissions import BasePermission


class IsEmailVerified(BasePermission):
    """Blocks any authenticated-but-unverified user from everything except
    the account-management endpoints that explicitly opt out (see their own
    permission_classes) — chiefly the ones needed to get verified at all."""

    message = "Please verify your email before continuing."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.isEmailVerified)
