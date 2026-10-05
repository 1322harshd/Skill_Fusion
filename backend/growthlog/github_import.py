import re

import requests

from .models import GrowthLogEntry

MAX_REPOS = 10


def extract_github_username(github_url: str) -> str:
    match = re.search(r"github\.com/([^/?#]+)", github_url or "")
    return match.group(1) if match else ""


def import_github_entries(user) -> list[GrowthLogEntry]:
    """Pull the learner's repository activity (public and private) from the
    GitHub API using their own connected OAuth token, and log any not already
    imported (FR-6.2). Requires the user to have connected GitHub via OAuth."""
    if not user.githubAccessToken:
        return []

    response = requests.get(
        "https://api.github.com/user/repos",
        params={"sort": "updated", "per_page": MAX_REPOS, "affiliation": "owner", "visibility": "all"},
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"token {user.githubAccessToken}",
        },
        timeout=10,
    )
    if response.status_code != 200:
        return []

    existing_urls = set(
        GrowthLogEntry.objects.filter(user=user, source=GrowthLogEntry.Source.GITHUB).values_list(
            "sourceUrl", flat=True
        )
    )

    created = []
    for repo in response.json():
        if repo.get("fork"):
            continue
        html_url = repo.get("html_url", "")
        if not html_url or html_url in existing_urls:
            continue
        entry = GrowthLogEntry.objects.create(
            user=user,
            source=GrowthLogEntry.Source.GITHUB,
            title=repo.get("name", "GitHub repository"),
            description=repo.get("description") or "",
            sourceUrl=html_url,
            skillTags=[repo["language"]] if repo.get("language") else [],
            competencyTags=[],
            verified=True,
            isPrivate=bool(repo.get("private")),
        )
        created.append(entry)

    return created
