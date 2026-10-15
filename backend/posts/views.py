from rest_framework import status
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from growthlog.models import GrowthLogEntry

from .models import PostDraft
from .serializers import GeneratePostSerializer, PostDraftSerializer, UpdatePostSerializer
from .services import generate_post_text


class GeneratePostView(APIView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "post-generate"

    def post(self, request):
        serializer = GeneratePostSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        entry = get_object_or_404(GrowthLogEntry, entryId=data["entryId"], user=request.user)

        try:
            text = generate_post_text(entry, tone=data["tone"], salt=data["salt"])
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_502_BAD_GATEWAY)

        # Redrafting (same entry, still a draft) replaces the existing draft
        # rather than piling up duplicates every time someone hits "Draft again".
        draft, _ = PostDraft.objects.update_or_create(
            user=request.user,
            entry=entry,
            status=PostDraft.Status.DRAFT,
            defaults={"tone": data["tone"], "text": text},
        )
        return Response(PostDraftSerializer(draft).data, status=status.HTTP_201_CREATED)


class PostDraftListView(APIView):
    def get(self, request):
        drafts = PostDraft.objects.filter(user=request.user)
        return Response(PostDraftSerializer(drafts, many=True).data)


class PostDraftDetailView(APIView):
    def patch(self, request, post_id):
        draft = get_object_or_404(PostDraft, postId=post_id, user=request.user)
        serializer = UpdatePostSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        for field, value in serializer.validated_data.items():
            setattr(draft, field, value)
        draft.save()
        return Response(PostDraftSerializer(draft).data)
