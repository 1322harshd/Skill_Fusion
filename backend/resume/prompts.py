from growthlog.models import GrowthLogEntry

MAX_ENTRIES = 15


def _skill_labels(skills):
    labels = []
    for s in skills or []:
        if isinstance(s, dict):
            labels.append(s.get("label") or s.get("name") or "")
        else:
            labels.append(str(s))
    return [s for s in labels if s]


def build_user_prompt(user, job_listing: str) -> str:
    entries = GrowthLogEntry.objects.filter(user=user).order_by("-loggedAt")[:MAX_ENTRIES]

    lines = [f"Learner name: {user.fullName}"]

    skills = _skill_labels(user.skills)
    if skills:
        lines.append(f"Declared skills: {', '.join(skills)}")

    lines.append("")
    lines.append("Growth Log evidence (most recent first):")
    if not entries:
        lines.append("(none logged yet)")
    for e in entries:
        tags = ", ".join(e.skillTags + e.competencyTags)
        status = "verified" if e.verified else "self-reported"
        line = f"- {e.title}: {e.description or '(no description)'} [{status}"
        if tags:
            line += f"; tags: {tags}"
        line += "]"
        lines.append(line)

    lines.append("")
    if job_listing and job_listing.strip():
        lines.append("Target job listing:")
        lines.append(job_listing.strip())
    else:
        lines.append("No specific job listing was provided — write a general-purpose version.")

    return "\n".join(lines)
