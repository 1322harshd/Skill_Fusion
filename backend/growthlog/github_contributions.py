import requests
from django.conf import settings

from .github_import import extract_github_username

WEEKS_TO_SHOW = 14

CONTRIBUTIONS_QUERY = """
query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        weeks {
          contributionDays {
            date
            contributionCount
          }
        }
      }
    }
  }
}
"""


class GithubContributionsError(Exception):
    """Raised when GitHub's GraphQL API can't return a contribution calendar."""


def fetch_contribution_weeks(github_url: str) -> list[list[dict]]:
    """Fetch the last WEEKS_TO_SHOW weeks of a user's public contribution
    calendar, as it appears on their GitHub profile, via GitHub's GraphQL API.

    Returns a list of weeks (oldest first), each a list of
    {"date": "YYYY-MM-DD", "count": int} entries (oldest day first).
    """
    username = extract_github_username(github_url)
    if not username:
        return []

    if not settings.GITHUB_API_TOKEN:
        raise GithubContributionsError("GITHUB_API_TOKEN is not configured.")

    response = requests.post(
        "https://api.github.com/graphql",
        json={"query": CONTRIBUTIONS_QUERY, "variables": {"login": username}},
        headers={"Authorization": f"Bearer {settings.GITHUB_API_TOKEN}"},
        timeout=10,
    )
    if response.status_code != 200:
        raise GithubContributionsError(f"GitHub API returned {response.status_code}.")

    payload = response.json()
    if payload.get("errors"):
        raise GithubContributionsError(payload["errors"][0].get("message", "Unknown GitHub API error."))

    user = payload.get("data", {}).get("user")
    if not user:
        raise GithubContributionsError(f"No GitHub user found for '{username}'.")

    weeks = user["contributionsCollection"]["contributionCalendar"]["weeks"]
    weeks = weeks[-WEEKS_TO_SHOW:]

    return [
        [{"date": day["date"], "count": day["contributionCount"]} for day in week["contributionDays"]]
        for week in weeks
    ]
