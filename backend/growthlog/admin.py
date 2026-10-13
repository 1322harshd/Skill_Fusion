from django.contrib import admin

from .models import Credential, GrowthLogEntry

admin.site.register(GrowthLogEntry)
admin.site.register(Credential)
