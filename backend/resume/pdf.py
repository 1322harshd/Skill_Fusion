from io import BytesIO

from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer


def render_pdf(title: str, paragraphs: list[str]) -> bytes:
    """Renders a simple title + paragraph-list document to PDF bytes."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=LETTER,
        leftMargin=0.9 * inch,
        rightMargin=0.9 * inch,
        topMargin=0.9 * inch,
        bottomMargin=0.9 * inch,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("DocTitle", parent=styles["Heading1"], spaceAfter=18)
    body_style = ParagraphStyle("Body", parent=styles["BodyText"], spaceAfter=12, leading=16)

    story = [Paragraph(title, title_style)]
    for p in paragraphs:
        if not p:
            continue
        safe = p.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        story.append(Paragraph(safe.replace("\n", "<br/>"), body_style))
    if not paragraphs:
        story.append(Spacer(1, 0))

    doc.build(story)
    return buffer.getvalue()
