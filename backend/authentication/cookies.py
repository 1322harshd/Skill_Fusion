from django.conf import settings


def set_refresh_cookie(response, refresh_token):
    # Refresh token lives in an httponly cookie (not the JSON body) so JS on the page
    # can never read it; scoped to /api/auth so it isn't sent on every request.
    response.set_cookie(
        key=settings.REFRESH_TOKEN_COOKIE_NAME,
        value=str(refresh_token),
        max_age=int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()),
        httponly=True,
        secure=not settings.DEBUG,
        samesite="Lax",
        path="/api/auth",
    )


def clear_refresh_cookie(response):
    # Path must match the one used in set_refresh_cookie, or the browser won't delete it.
    response.delete_cookie(
        key=settings.REFRESH_TOKEN_COOKIE_NAME,
        path="/api/auth",
    )
