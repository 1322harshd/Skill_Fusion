"""
URL configuration for SkillFusion project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import include, path

from authentication.urls import auth_urlpatterns, users_urlpatterns
from growthlog.urls import growthlog_urlpatterns
from resume.urls import resume_urlpatterns
from posts.urls import posts_urlpatterns

urlpatterns = [
    path('api/fusion/', include('fusion_engine.urls')),
    path('api/roadmap/', include('roadmaps.urls')),
    path('api/project/', include('projects.urls')),
    path('api/score/', include('scores.urls')),
    path('api/explain/', include('explain.urls')),
    path('api/llm/', include('prompt_engineering.urls')),
    path('api/infra/', include('infra.urls')),
    path('admin/', admin.site.urls),
    path('api/auth/', include(auth_urlpatterns)),
    path('api/users/', include(users_urlpatterns)),
    path('api/growth-log/', include(growthlog_urlpatterns)),
    path('api/resume/', include(resume_urlpatterns)),
    path('api/posts/', include(posts_urlpatterns)),
]
