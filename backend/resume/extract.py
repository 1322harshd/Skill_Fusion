from io import BytesIO

from pypdf import PdfReader
from pypdf.errors import PdfReadError

MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5MB
ALLOWED_EXTENSIONS = {"pdf", "txt"}


class ExtractionError(Exception):
    """Raised when an uploaded file can't be read as a resume."""


def _extension(filename: str) -> str:
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


def extract_text(uploaded_file) -> str:
    """Pulls plain text out of an uploaded .pdf or .txt resume. Raises
    ExtractionError for anything else, anything oversized, or a file that
    yields no readable text (e.g. a scanned/image-only PDF)."""
    if uploaded_file.size > MAX_UPLOAD_BYTES:
        raise ExtractionError("That file is too large — please upload something under 5MB.")

    ext = _extension(uploaded_file.name or "")
    if ext not in ALLOWED_EXTENSIONS:
        raise ExtractionError("Please upload a .pdf or .txt resume.")

    raw = uploaded_file.read()

    if ext == "txt":
        text = raw.decode("utf-8", errors="ignore")
    else:
        try:
            reader = PdfReader(BytesIO(raw))
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
        except PdfReadError as e:
            raise ExtractionError("Couldn't read that PDF — it may be corrupted.") from e

    text = text.strip()
    if not text:
        raise ExtractionError("Couldn't find any text in that file — if it's a scanned image, try a text-based PDF instead.")
    return text
