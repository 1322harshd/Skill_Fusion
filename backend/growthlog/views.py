from django.core.cache import cache
from rest_framework import status
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from .github_contributions import GithubContributionsError, fetch_contribution_weeks
from .github_import import import_github_entries
from .models import Credential, GrowthLogEntry
from .serializers import (
    CreateEntrySerializer,
    GrowthLogEntrySerializer,
    VerifyCredentialSerializer,
)
from .verification import verify_credential


class EntryListCreateView(APIView):
    def get(self, request):
        entries = GrowthLogEntry.objects.filter(user=request.user)
        return Response(GrowthLogEntrySerializer(entries, many=True).data)

    def post(self, request):
        serializer = CreateEntrySerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        entry = serializer.save()
        return Response(GrowthLogEntrySerializer(entry).data, status=status.HTTP_201_CREATED)


class EntryDetailView(APIView):
    def get(self, request, entry_id):
        entry = get_object_or_404(GrowthLogEntry, entryId=entry_id, user=request.user)
        return Response(GrowthLogEntrySerializer(entry).data)

    def delete(self, request, entry_id):
        entry = get_object_or_404(GrowthLogEntry, entryId=entry_id, user=request.user)
        entry.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class VerifyCredentialView(APIView):
    def post(self, request, entry_id):
        entry = get_object_or_404(GrowthLogEntry, entryId=entry_id, user=request.user)
        serializer = VerifyCredentialSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        credential, _ = Credential.objects.update_or_create(
            entry=entry,
            defaults={
                "verificationUrl": serializer.validated_data["verificationUrl"],
                "issuer": serializer.validated_data.get("issuer", ""),
                "verificationStatus": Credential.Status.PENDING,
                "verifiedAt": None,
            },
        )
        verify_credential(credential)
        entry.refresh_from_db()
        return Response(GrowthLogEntrySerializer(entry).data)


class GithubImportView(APIView):
    def post(self, request):
        if not request.user.githubUrl:
            return Response(
                {"detail": "Connect a GitHub URL to your profile first."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        created = import_github_entries(request.user)
        return Response(
            {"imported": len(created), "entries": GrowthLogEntrySerializer(created, many=True).data}
        )


class GithubContributionsView(APIView):
    def get(self, request):
        github_url = request.user.githubUrl
        if not github_url:
            return Response(
                {"detail": "Connect a GitHub URL to your profile first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cache_key = f"github-contributions:{github_url}"
        weeks = cache.get(cache_key)
        if weeks is None:
            try:
                weeks = fetch_contribution_weeks(github_url)
            except GithubContributionsError as e:
                return Response({"detail": str(e)}, status=status.HTTP_502_BAD_GATEWAY)
            cache.set(cache_key, weeks, timeout=3600)

        return Response({"weeks": weeks})


class StatsView(APIView):
    def get(self, request):
        entries = GrowthLogEntry.objects.filter(user=request.user)
        total = entries.count()
        verified = entries.filter(verified=True).count()
        pending = entries.filter(credential__verificationStatus=Credential.Status.PENDING).count()
        return Response({"total": total, "verified": verified, "pending": pending})
