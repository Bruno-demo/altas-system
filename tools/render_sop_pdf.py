from __future__ import annotations

import re
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.platypus import ListFlowable, ListItem, Paragraph, SimpleDocTemplate, Spacer


def format_inline(text: str) -> str:
    parts = re.split(r"(`[^`]+`)", text)
    rendered: list[str] = []
    for part in parts:
        if not part:
            continue
        if part.startswith("`") and part.endswith("`") and len(part) >= 2:
            content = escape(part[1:-1])
            rendered.append(f'<font name="Courier">{content}</font>')
        else:
            rendered.append(escape(part))
    return "".join(rendered)


def draw_footer(canv: canvas.Canvas, doc: SimpleDocTemplate) -> None:
    canv.saveState()
    canv.setFont("Helvetica", 8)
    canv.setFillColor(colors.HexColor("#6B7280"))
    footer = f"AL-TAHS On-Prem SOP | Page {doc.page}"
    canv.drawRightString(A4[0] - 15 * mm, 10 * mm, footer)
    canv.restoreState()


def build_pdf(md_path: Path, pdf_path: Path) -> None:
    styles = getSampleStyleSheet()
    title = ParagraphStyle(
        "SopTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#0F172A"),
        spaceAfter=8,
    )
    h2 = ParagraphStyle(
        "SopH2",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#0F172A"),
        spaceBefore=8,
        spaceAfter=4,
    )
    h3 = ParagraphStyle(
        "SopH3",
        parent=styles["Heading3"],
        fontName="Helvetica-Bold",
        fontSize=10.5,
        leading=14,
        textColor=colors.HexColor("#111827"),
        spaceBefore=4,
        spaceAfter=3,
    )
    body = ParagraphStyle(
        "SopBody",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#111827"),
        spaceAfter=3,
    )
    item = ParagraphStyle(
        "SopItem",
        parent=body,
        leftIndent=2,
        spaceAfter=1,
    )

    lines = md_path.read_text(encoding="utf-8").splitlines()
    flowables = []
    idx = 0

    while idx < len(lines):
        raw = lines[idx].rstrip()
        stripped = raw.strip()

        if not stripped:
            flowables.append(Spacer(1, 3))
            idx += 1
            continue

        if stripped.startswith("# "):
            flowables.append(Paragraph(format_inline(stripped[2:].strip()), title))
            idx += 1
            continue

        if stripped.startswith("## "):
            flowables.append(Paragraph(format_inline(stripped[3:].strip()), h2))
            idx += 1
            continue

        if stripped.startswith("### "):
            flowables.append(Paragraph(format_inline(stripped[4:].strip()), h3))
            idx += 1
            continue

        if re.match(r"^[-*]\s+", stripped):
            items = []
            while idx < len(lines):
                candidate = lines[idx].strip()
                if not re.match(r"^[-*]\s+", candidate):
                    break
                items.append(re.sub(r"^[-*]\s+", "", candidate))
                idx += 1
            flowables.append(
                ListFlowable(
                    [ListItem(Paragraph(format_inline(text), item)) for text in items],
                    bulletType="bullet",
                    leftIndent=16,
                    bulletFontName="Helvetica",
                    bulletFontSize=9,
                    spaceAfter=4,
                )
            )
            continue

        if re.match(r"^\d+\.\s+", stripped):
            items = []
            while idx < len(lines):
                candidate = lines[idx].strip()
                if not re.match(r"^\d+\.\s+", candidate):
                    break
                items.append(re.sub(r"^\d+\.\s+", "", candidate))
                idx += 1
            flowables.append(
                ListFlowable(
                    [ListItem(Paragraph(format_inline(text), item)) for text in items],
                    bulletType="1",
                    leftIndent=16,
                    bulletFontName="Helvetica",
                    bulletFontSize=9,
                    spaceAfter=4,
                )
            )
            continue

        flowables.append(Paragraph(format_inline(stripped), body))
        idx += 1

    doc = SimpleDocTemplate(
        str(pdf_path),
        pagesize=A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=14 * mm,
        bottomMargin=16 * mm,
        title="AL-TAHS On-Prem Operations SOP",
        author="AL-TAHS System",
    )
    doc.build(flowables, onFirstPage=draw_footer, onLaterPages=draw_footer)


def main() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    md_path = repo_root / "docs" / "ONPREM-SOP.md"
    pdf_path = repo_root / "docs" / "ONPREM-SOP.pdf"
    if not md_path.exists():
        raise FileNotFoundError(f"Missing source markdown: {md_path}")
    build_pdf(md_path, pdf_path)
    print(f"Generated PDF: {pdf_path}")


if __name__ == "__main__":
    main()
