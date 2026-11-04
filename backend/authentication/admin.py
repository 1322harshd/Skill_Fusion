from django.contrib import admin

from .models import User

# Expose the custom User model in Django's built-in admin with the default list/edit view.
admin.site.register(User)
