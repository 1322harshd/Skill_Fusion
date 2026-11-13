from io import BytesIO

from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas as pdfcanvas
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

# The canvas editor's page is 816x1056px at 96dpi — exactly 612x792pt (LETTER)
# at the standard 72pt/96px = 0.75 conversion, so no separate page-size
# constant is needed for the layout-driven render path below.
PX_TO_PT = 72 / 96


def _escape(text: str) -> str:
    """Paragraph() parses its text as a small HTML-like markup, so this must
    run before building one — otherwise raw &/</> in user text either breaks
    the parser or renders wrong. Real newlines become <br/> to preserve
    line breaks, since Paragraph doesn't treat \\n specially on its own."""
    safe = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return safe.replace("\n", "<br/>")


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
        story.append(Paragraph(_escape(p), body_style))
    if not paragraphs:
        story.append(Spacer(1, 0))

    doc.build(story)
    return buffer.getvalue()


def render_resume_sections_pdf(title: str, summary: str, skill_groups: list, projects: list) -> bytes:
    """Renders the grouped-skills/grouped-projects resume shape. Separate from
    render_pdf() above because this one needs real <b>/<br/> markup in the
    output (section headings, project titles) — render_pdf()'s _escape()
    strips any markup callers pass in, by design, so it can't take raw HTML
    from the caller. Here, every piece of actual user/model text is escaped
    individually before being wrapped in hand-written (never escaped) tags."""
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
    heading_style = ParagraphStyle("SectionHeading", parent=styles["Heading3"], spaceBefore=6, spaceAfter=6)
    body_style = ParagraphStyle("Body", parent=styles["BodyText"], spaceAfter=12, leading=16)

    story = [Paragraph(_escape(title), title_style)]
    if summary:
        story.append(Paragraph(_escape(summary), body_style))

    if skill_groups:
        story.append(Paragraph("TECHNICAL SKILLS", heading_style))
        for g in skill_groups:
            line = f"<b>{_escape(g['category'])}:</b> {_escape(', '.join(g['skills']))}"
            story.append(Paragraph(line, body_style))

    if projects:
        story.append(Paragraph("PROJECTS", heading_style))
        for p in projects:
            header = f"<b>{_escape(p['title'])}</b>"
            if p.get("techStack"):
                header += f" — {_escape(p['techStack'])}"
            bullets = "<br/>".join(f"• {_escape(b)}" for b in p["bullets"])
            story.append(Paragraph(header + "<br/>" + bullets, body_style))

    doc.build(story)
    return buffer.getvalue()


def render_pdf_from_layout(layout: dict) -> bytes:
    """Renders the canvas editor's freeform blocks to PDF at their exact
    positions — unlike render_pdf() above (Platypus/SimpleDocTemplate, which
    only flows content top-to-bottom), this uses reportlab's low-level
    Canvas so each block lands at its own x/y. No separate title param —
    the frontend sends the name/title as just another block, so there's one
    rendering path instead of a special-cased header."""
    buffer = BytesIO()
    c = pdfcanvas.Canvas(buffer, pagesize=LETTER)
    page_height_pt = LETTER[1]
    styles = getSampleStyleSheet()

    for block in layout.get("blocks", []):
        content = (block.get("content") or "").strip()
        if not content:
            continue
        style = ParagraphStyle(
            f"block-{block.get('id', '')}",
            parent=styles["BodyText"],
            fontSize=block.get("fontSize", 11),
            leading=block.get("fontSize", 11) * 1.3,
            alignment={"left": 0, "center": 1, "right": 2, "justify": 4}.get(block.get("align", "left"), 0),
            fontName="Helvetica-Bold" if block.get("fontWeight") == "bold" else "Helvetica",
        )
        paragraph = Paragraph(_escape(content), style)

        x_pt = block.get("x", 0) * PX_TO_PT
        width_pt = block.get("width", 100) * PX_TO_PT
        height_pt = block.get("height", 20) * PX_TO_PT
        top_y_pt = page_height_pt - (block.get("y", 0) * PX_TO_PT)

        # height passed to wrap() is advisory only — it doesn't clip, so the
        # draw position must anchor to the paragraph's *actual* wrapped
        # height (overflow grows downward from the top), not the stored
        # block height.
        _, actual_height_pt = paragraph.wrap(width_pt, height_pt)
        draw_y_pt = top_y_pt - actual_height_pt

        # Clip to the block's own box so overflow behaves the same as the
        # editor's on-screen CSS (overflow: hidden) — what you see is what
        # you get, rather than text bleeding into neighboring blocks.
        c.saveState()
        clip = c.beginPath()
        clip.rect(x_pt, top_y_pt - height_pt, width_pt, height_pt)
        c.clipPath(clip, stroke=0, fill=0)
        paragraph.drawOn(c, x_pt, draw_y_pt)
        c.restoreState()

    c.save()
    return buffer.getvalue()
