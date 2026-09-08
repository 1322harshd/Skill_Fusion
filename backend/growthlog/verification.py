from django.utils import timezone
import requests

from .models import Credential


def verify_credential(credential: Credential) -> Credential:
    """Fetch the learner-supplied public verification URL and confirm it
    resolves to a genuine credential naming the learner (SRS 3.5.5)."""
    full_name = credential.entry.user.fullName.strip().lower()
    try:
        response = requests.get(credential.verificationUrl, timeout=10)
        page_text = response.text.lower()
        matched = response.status_code == 200 and full_name and full_name in page_text
    except requests.RequestException:
        matched = False

    credential.verificationStatus = Credential.Status.VERIFIED if matched else Credential.Status.FAILED
    credential.verifiedAt = timezone.now()
    credential.save(update_fields=["verificationStatus", "verifiedAt"])

    if matched:
        credential.entry.verified = True
        credential.entry.save(update_fields=["verified"])

    return credential
