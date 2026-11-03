from django.contrib import admin

from .models import ChatProfile, Report
from .services import apply_moderation_action


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ["target_handle", "status", "action", "reasonOrAuto", "createdAt", "reviewedAt"]
    list_filter = ["status", "action", "autoFlagged"]
    search_fields = ["targetUser__email", "reason"]
    readonly_fields = [
        "reportId",
        "reporter",
        "targetUser",
        "reportedContent",
        "reason",
        "autoFlagged",
        "createdAt",
        "reviewedAt",
    ]
    fields = [
        "reportId",
        "reporter",
        "targetUser",
        "reportedContent",
        "reason",
        "autoFlagged",
        "status",
        "action",
        "createdAt",
        "reviewedAt",
    ]
    actions = ["warn_target", "ban_target", "dismiss_report"]
    ordering = ["-createdAt"]

    @admin.display(description="Target")
    def target_handle(self, report):
        profile = getattr(report.targetUser, "chat_profile", None)
        return profile.handle if profile else report.targetUser.email

    @admin.display(description="Reason")
    def reasonOrAuto(self, report):
        return "Auto-flagged by filter" if report.autoFlagged else (report.reason or "—")

    @admin.display(description="Reported content")
    def reportedContent(self, report):
        if report.roomMessage_id:
            return f"[Open room] {report.roomMessage.text}"
        if report.privateMessage_id:
            return f"[Private room] {report.privateMessage.text}"
        return "(peer report — no specific message)"

    def _apply(self, request, queryset, action, verb):
        pending = queryset.filter(status="pending")
        for report in pending:
            apply_moderation_action(report, action)
        skipped = queryset.count() - pending.count()
        msg = f"{verb} {pending.count()} report(s)."
        if skipped:
            msg += f" Skipped {skipped} already-reviewed report(s)."
        self.message_user(request, msg)

    @admin.action(description="Warn the reported user")
    def warn_target(self, request, queryset):
        self._apply(request, queryset, "warn", "Warned")

    @admin.action(description="Ban the reported user")
    def ban_target(self, request, queryset):
        self._apply(request, queryset, "ban", "Banned")

    @admin.action(description="Dismiss (no action)")
    def dismiss_report(self, request, queryset):
        self._apply(request, queryset, "dismiss", "Dismissed")


@admin.register(ChatProfile)
class ChatProfileAdmin(admin.ModelAdmin):
    list_display = ["handle", "user", "isBanned", "warnCount"]
    list_filter = ["isBanned"]
    search_fields = ["handle", "user__email"]
