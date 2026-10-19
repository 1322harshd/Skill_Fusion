from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from authentication.models import User

from .models import ChatProfile, PeerMatch, Report, RoomMessage
from .services import find_or_create_match, get_or_create_chat_profile


def make_user(email):
    return User.objects.create_user(email=email, password="CorrectHorse1!", fullName=email.split("@")[0].title())


class ChatProfileTests(TestCase):
    def test_handle_is_not_derived_from_email_or_name(self):
        user = make_user("ada@example.com")
        self.client = APIClient()
        self.client.force_authenticate(user=user)
        response = self.client.get("/api/connect/me")
        handle = response.json()["handle"]
        self.assertNotIn("ada", handle.lower())
        self.assertNotIn("example", handle.lower())

    def test_requires_authentication(self):
        response = APIClient().get("/api/connect/me")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class MatchingTests(TestCase):
    def test_first_user_waits_second_user_joins(self):
        ada = make_user("ada@example.com")
        bo = make_user("bo@example.com")

        match1 = find_or_create_match(ada, "Design×AI")
        self.assertEqual(match1.status, PeerMatch.Status.WAITING)

        match2 = find_or_create_match(bo, "Design×AI")
        self.assertEqual(match2.status, PeerMatch.Status.ACTIVE)
        self.assertEqual(match1.matchId, match2.matchId)

    def test_different_fusion_labels_dont_match(self):
        ada = make_user("ada@example.com")
        bo = make_user("bo@example.com")
        find_or_create_match(ada, "Design×AI")
        match2 = find_or_create_match(bo, "Marketing×Data")
        self.assertEqual(match2.status, PeerMatch.Status.WAITING)
        self.assertNotEqual(match2.fusionLabel, "Design×AI")

    def test_rejoining_same_fusion_returns_same_waiting_match(self):
        ada = make_user("ada@example.com")
        match1 = find_or_create_match(ada, "Design×AI")
        match2 = find_or_create_match(ada, "Design×AI")
        self.assertEqual(match1.matchId, match2.matchId)

    def test_match_endpoint_never_reveals_real_identity(self):
        ada = make_user("ada@example.com")
        bo = make_user("bo@example.com")
        find_or_create_match(ada, "Design×AI")
        find_or_create_match(bo, "Design×AI")

        client = APIClient()
        client.force_authenticate(user=ada)
        match = PeerMatch.objects.get(fusionLabel="Design×AI")
        response = client.get(f"/api/connect/matches/{match.matchId}")
        body = response.json()
        self.assertNotIn("bo@example.com", str(body))
        self.assertNotIn("Bo", str(body))
        self.assertIsNotNone(body["peerHandle"])


class RoomChatTests(TestCase):
    def setUp(self):
        self.ada = make_user("ada@example.com")
        self.client = APIClient()
        self.client.force_authenticate(user=self.ada)

    def test_send_and_list_message(self):
        response = self.client.post("/api/connect/room/messages", {"text": "hello room"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.json()["self"])

        listed = self.client.get("/api/connect/room/messages")
        self.assertEqual(len(listed.json()), 1)
        self.assertEqual(listed.json()[0]["text"], "hello room")

    def test_message_never_exposes_real_name_or_email(self):
        self.client.post("/api/connect/room/messages", {"text": "hi"}, format="json")
        other = make_user("bo@example.com")
        other_client = APIClient()
        other_client.force_authenticate(user=other)
        listed = other_client.get("/api/connect/room/messages")
        self.assertNotIn("ada@example.com", str(listed.json()))
        self.assertNotIn("Ada", str(listed.json()))

    def test_banned_content_is_auto_hidden_and_flagged(self):
        response = self.client.post("/api/connect/room/messages", {"text": "you fucking idiot"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        msg = RoomMessage.objects.get()
        self.assertTrue(msg.hidden)
        self.assertTrue(Report.objects.filter(roomMessage=msg, autoFlagged=True).exists())

        # Hidden messages don't show up in the public list.
        listed = self.client.get("/api/connect/room/messages")
        self.assertEqual(len(listed.json()), 0)

    def test_banned_user_cannot_send_messages(self):
        profile = get_or_create_chat_profile(self.ada)
        profile.isBanned = True
        profile.save()
        response = self.client.post("/api/connect/room/messages", {"text": "hi"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class PrivateChatAndReportTests(TestCase):
    def setUp(self):
        self.ada = make_user("ada@example.com")
        self.bo = make_user("bo@example.com")
        self.match = find_or_create_match(self.ada, "Design×AI")
        find_or_create_match(self.bo, "Design×AI")
        self.match.refresh_from_db()
        self.ada_client = APIClient()
        self.ada_client.force_authenticate(user=self.ada)
        self.bo_client = APIClient()
        self.bo_client.force_authenticate(user=self.bo)

    def test_both_participants_can_exchange_private_messages(self):
        self.ada_client.post(f"/api/connect/matches/{self.match.matchId}/messages", {"text": "hey"}, format="json")
        self.bo_client.post(f"/api/connect/matches/{self.match.matchId}/messages", {"text": "hi back"}, format="json")
        listed = self.ada_client.get(f"/api/connect/matches/{self.match.matchId}/messages")
        texts = [m["text"] for m in listed.json()]
        self.assertEqual(texts, ["hey", "hi back"])

    def test_stranger_cannot_read_a_match_they_are_not_in(self):
        stranger = make_user("carl@example.com")
        stranger_client = APIClient()
        stranger_client.force_authenticate(user=stranger)
        response = stranger_client.get(f"/api/connect/matches/{self.match.matchId}/messages")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_reporting_a_peer_closes_the_match(self):
        bo_handle = get_or_create_chat_profile(self.bo).handle
        response = self.ada_client.post(f"/api/connect/peers/{bo_handle}/report")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.match.refresh_from_db()
        self.assertEqual(self.match.status, PeerMatch.Status.CLOSED)
        self.assertTrue(Report.objects.filter(targetUser=self.bo).exists())


class ExchangeTests(TestCase):
    def setUp(self):
        self.ada = make_user("ada@example.com")
        self.bo = make_user("bo@example.com")
        self.match = find_or_create_match(self.ada, "Design×AI")
        find_or_create_match(self.bo, "Design×AI")
        self.match.refresh_from_db()
        self.ada_client = APIClient()
        self.ada_client.force_authenticate(user=self.ada)
        self.bo_client = APIClient()
        self.bo_client.force_authenticate(user=self.bo)
        self.url = f"/api/connect/matches/{self.match.matchId}/exchange"

    def test_requires_both_sides_to_confirm_before_revealing_identity(self):
        propose = self.ada_client.post(self.url, {"action": "propose"}, format="json")
        self.assertEqual(propose.json()["status"], "awaiting-peer")

        bo_view = self.bo_client.get(self.url)
        self.assertEqual(bo_view.json()["status"], "awaiting-you")
        self.assertNotIn("peer", bo_view.json())

        confirm = self.bo_client.post(self.url, {"action": "confirm"}, format="json")
        self.assertEqual(confirm.json()["status"], "done")
        self.assertEqual(confirm.json()["peer"]["fullName"], self.ada.fullName)

        ada_view = self.ada_client.get(self.url)
        self.assertEqual(ada_view.json()["peer"]["fullName"], self.bo.fullName)


class ModerationTests(TestCase):
    def setUp(self):
        self.ada = make_user("ada@example.com")
        self.moderator = make_user("mod@example.com")
        self.moderator.is_staff = True
        self.moderator.save()
        self.ada_client = APIClient()
        self.ada_client.force_authenticate(user=self.ada)
        self.mod_client = APIClient()
        self.mod_client.force_authenticate(user=self.moderator)
        msg = self.ada_client.post("/api/connect/room/messages", {"text": "hello"}, format="json").json()
        self.message_id = msg["id"]

    def test_non_staff_cannot_access_moderation(self):
        response = self.ada_client.get("/api/connect/moderation/reports")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_report_then_warn(self):
        bo = make_user("bo@example.com")
        bo_client = APIClient()
        bo_client.force_authenticate(user=bo)
        report = bo_client.post(
            "/api/connect/report", {"messageType": "room", "messageId": self.message_id, "reason": "spam"}, format="json"
        )
        self.assertEqual(report.status_code, status.HTTP_201_CREATED)
        report_id = report.json()["reportId"]

        pending = self.mod_client.get("/api/connect/moderation/reports")
        self.assertEqual(len(pending.json()), 1)

        action = self.mod_client.post(
            f"/api/connect/moderation/reports/{report_id}/action", {"action": "warn"}, format="json"
        )
        self.assertEqual(action.status_code, status.HTTP_200_OK)
        self.assertEqual(ChatProfile.objects.get(user=self.ada).warnCount, 1)

    def test_ban_action_sets_is_banned(self):
        report = Report.objects.create(reporter=self.moderator, targetUser=self.ada, reason="x")
        action = self.mod_client.post(
            f"/api/connect/moderation/reports/{report.reportId}/action", {"action": "ban"}, format="json"
        )
        self.assertEqual(action.status_code, status.HTTP_200_OK)
        self.assertTrue(ChatProfile.objects.get(user=self.ada).isBanned)

    def test_report_auto_hides_after_threshold(self):
        reporters = [make_user(f"r{i}@example.com") for i in range(2)]
        for r in reporters:
            c = APIClient()
            c.force_authenticate(user=r)
            c.post("/api/connect/report", {"messageType": "room", "messageId": self.message_id}, format="json")
        self.assertTrue(RoomMessage.objects.get(messageId=self.message_id).hidden)
