from django.contrib import admin

from .models import Credential, GrowthLogEntry

# Make growth-log entries and their verification credentials manageable from the admin site.
admin.site.register(GrowthLogEntry)
admin.site.register(Credential)
