from django.urls import path, include

urlpatterns = [
    path("api/fusion/", include("apps.fusion_engine.urls")),
    path("api/roadmap/", include("apps.roadmaps.urls")),
    path("api/project/", include("apps.projects.urls")),
    path("api/score/", include("apps.scores.urls")),
    path("api/explain/", include("apps.explain.urls")),
    path("api/llm/", include("apps.prompt_engineering.urls")),
    path("api/infra/", include("apps.infra.urls")),
]
