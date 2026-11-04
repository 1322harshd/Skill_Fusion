import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def ordered_pair(a_id, b_id):
    return (a_id, b_id) if str(a_id) < str(b_id) else (b_id, a_id)


def backfill_conversations(apps, schema_editor):
    """Give every PeerMatch that already has messages or an exchange a
    permanent Conversation, so existing dev data survives the move from
    match-scoped to conversation-scoped storage."""
    PeerMatch = apps.get_model("connect", "PeerMatch")
    Conversation = apps.get_model("connect", "Conversation")
    PrivateMessage = apps.get_model("connect", "PrivateMessage")
    Exchange = apps.get_model("connect", "Exchange")

    match_ids = set(PrivateMessage.objects.values_list("match_id", flat=True))
    match_ids |= set(Exchange.objects.values_list("match_id", flat=True))

    convo_by_match_id = {}
    for match in PeerMatch.objects.filter(matchId__in=match_ids):
        if not match.userB_id:
            continue
        a_id, b_id = ordered_pair(match.userA_id, match.userB_id)
        convo, _ = Conversation.objects.get_or_create(
            userA_id=a_id, userB_id=b_id, defaults={"fusionLabel": match.fusionLabel or ""}
        )
        convo_by_match_id[match.matchId] = convo
        match.conversation = convo
        match.save(update_fields=["conversation"])

    for msg in PrivateMessage.objects.all():
        convo = convo_by_match_id.get(msg.match_id)
        if convo is not None:
            msg.conversation = convo
            msg.save(update_fields=["conversation"])

    for ex in Exchange.objects.all():
        convo = convo_by_match_id.get(ex.match_id)
        if convo is not None:
            ex.conversation = convo
            ex.save(update_fields=["conversation"])


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("connect", "0002_peermatch_closereason_peermatch_requestedby_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="Conversation",
            fields=[
                ("conversationId", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("fusionLabel", models.CharField(blank=True, default="", max_length=100)),
                ("status", models.CharField(choices=[("active", "Active"), ("blocked", "Blocked")], default="active", max_length=10)),
                ("createdAt", models.DateTimeField(auto_now_add=True)),
                ("lastMessageAt", models.DateTimeField(auto_now_add=True)),
                (
                    "blockedBy",
                    models.ForeignKey(
                        blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+", to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "userA",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="conversations_as_a", to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "userB",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="conversations_as_b", to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"ordering": ["-lastMessageAt"]},
        ),
        migrations.AddConstraint(
            model_name="conversation",
            constraint=models.UniqueConstraint(fields=("userA", "userB"), name="unique_conversation_pair"),
        ),
        migrations.AddField(
            model_name="peermatch",
            name="conversation",
            field=models.ForeignKey(
                blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                related_name="matches", to="connect.conversation",
            ),
        ),
        migrations.AddField(
            model_name="privatemessage",
            name="conversation",
            field=models.ForeignKey(
                null=True, on_delete=django.db.models.deletion.CASCADE,
                related_name="messages", to="connect.conversation",
            ),
        ),
        migrations.AddField(
            model_name="exchange",
            name="conversation",
            field=models.OneToOneField(
                null=True, on_delete=django.db.models.deletion.CASCADE,
                related_name="exchange", to="connect.conversation",
            ),
        ),
        migrations.RunPython(backfill_conversations, migrations.RunPython.noop),
        migrations.RemoveField(model_name="privatemessage", name="match"),
        migrations.RemoveField(model_name="exchange", name="match"),
        migrations.AlterField(
            model_name="privatemessage",
            name="conversation",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="messages", to="connect.conversation",
            ),
        ),
        migrations.AlterField(
            model_name="exchange",
            name="conversation",
            field=models.OneToOneField(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="exchange", to="connect.conversation",
            ),
        ),
    ]
