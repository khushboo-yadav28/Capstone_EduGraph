import os
from io import BytesIO
from datetime import datetime
from typing import Optional
import pymupdf


def generate_course_certificate(
    student_name: str,
    course_title: str,
    completion_date: datetime,
    certificate_id: Optional[str] = None,
    output_format: str = "png"
) -> BytesIO:
    """
    Generates an official, non-editable verified Certificate of Completion
    rendered natively via PyMuPDF as a high-resolution PNG image or vector PDF.
    """
    width = 1920
    height = 1080

    doc = pymupdf.open()
    page = doc.new_page(width=width, height=height)

    # Color definitions (normalized 0.0 - 1.0 for PyMuPDF)
    NAVY = (17 / 255, 34 / 255, 23 / 255)        # #112217 - EduGraph Primary Dark
    GOLD = (212 / 255, 175 / 255, 55 / 255)      # #D4AF37 - Prestige Gold
    SAGE = (46 / 255, 90 / 255, 68 / 255)        # #2E5A44 - Sage Green Accent
    MUTED = (74 / 255, 107 / 255, 93 / 255)      # #4A6B5D - Muted Green Slate
    DARK_TEXT = (20 / 255, 30 / 255, 25 / 255)   # #141E19 - Deep Text
    BG_CREAM = (251 / 255, 252 / 255, 251 / 255) # #FBFBFB - Subtle Cream Background

    # 1. Background Fill
    page.draw_rect(pymupdf.Rect(0, 0, width, height), color=None, fill=BG_CREAM)

    # 2. Outer & Inner Ornamental Borders
    page.draw_rect(pymupdf.Rect(40, 40, width - 40, height - 40), color=NAVY, width=8)
    page.draw_rect(pymupdf.Rect(58, 58, width - 58, height - 58), color=GOLD, width=3)
    page.draw_rect(pymupdf.Rect(72, 72, width - 72, height - 72), color=NAVY, width=1)

    # Corner Accents (Decorative Gold Squares)
    corner_size = 36
    corners = [
        (40, 40),
        (width - 40 - corner_size, 40),
        (40, height - 40 - corner_size),
        (width - 40 - corner_size, height - 40 - corner_size)
    ]
    for cx, cy in corners:
        page.draw_rect(pymupdf.Rect(cx, cy, cx + corner_size, cy + corner_size), color=GOLD, fill=GOLD)

    # 3. Header & Institution Branding
    page.insert_textbox(
        pymupdf.Rect(100, 110, width - 100, 160),
        "EDUGRAPH KNOWLEDGE GRAPH ADAPTIVE PLATFORM",
        fontsize=22,
        fontname="hebo",
        color=MUTED,
        align=1
    )

    page.insert_textbox(
        pymupdf.Rect(100, 160, width - 100, 270),
        "CERTIFICATE OF COMPLETION",
        fontsize=56,
        fontname="hebo",
        color=NAVY,
        align=1
    )

    # Subtle Gold divider line under header
    page.draw_line(pymupdf.Point(width / 2 - 250, 280), pymupdf.Point(width / 2 + 250, 280), color=GOLD, width=2)

    # 4. Presentation Subtitle
    page.insert_textbox(
        pymupdf.Rect(100, 310, width - 100, 370),
        "THIS IS PROUDLY PRESENTED TO",
        fontsize=20,
        fontname="helv",
        color=MUTED,
        align=1
    )

    # 5. Student Name (Hero Element)
    clean_student_name = student_name.strip().upper() if student_name else "VALUED SCHOLAR"
    page.insert_textbox(
        pymupdf.Rect(120, 380, width - 120, 490),
        clean_student_name,
        fontsize=64,
        fontname="hebo",
        color=DARK_TEXT,
        align=1
    )

    # Underline accent for student name
    page.draw_line(pymupdf.Point(width / 2 - 380, 500), pymupdf.Point(width / 2 + 380, 500), color=GOLD, width=4)

    # 6. Curriculum Mastery Statement
    page.insert_textbox(
        pymupdf.Rect(160, 530, width - 160, 600),
        "for successfully demonstrating 100% mastery across all adaptive knowledge graph nodes,\n"
        "prerequisite learning dependencies, and dynamic evaluation benchmarks for the curriculum:",
        fontsize=20,
        fontname="helv",
        color=MUTED,
        align=1
    )

    # 7. Course Title (Prominent Sage Green)
    clean_course_title = course_title.strip() if course_title else "Adaptive Knowledge Graph Curriculum"
    page.insert_textbox(
        pymupdf.Rect(140, 610, width - 140, 720),
        clean_course_title,
        fontsize=44,
        fontname="hebo",
        color=SAGE,
        align=1
    )

    # 8. Footer Section: Left (Date & Credential ID), Center (Seal), Right (Signatures)
    formatted_date = completion_date.strftime("%B %d, %Y") if isinstance(completion_date, datetime) else str(completion_date)
    cred_id = certificate_id or f"EDG-CERT-{int(completion_date.timestamp()) if hasattr(completion_date, 'timestamp') else '2026'}"

    # Left: Issuance details
    page.draw_line(pymupdf.Point(180, 890), pymupdf.Point(580, 890), color=MUTED, width=1.5)
    page.insert_textbox(
        pymupdf.Rect(180, 905, 580, 990),
        f"Date of Issuance: {formatted_date}\nVerification ID: {cred_id}",
        fontsize=16,
        fontname="helv",
        color=DARK_TEXT,
        align=0  # Left aligned
    )

    # Center: Verified Credential Badge Seal
    center_x = width / 2
    seal_y = 880
    page.draw_rect(pymupdf.Rect(center_x - 140, seal_y - 45, center_x + 140, seal_y + 45), color=GOLD, fill=NAVY, width=2)
    page.insert_textbox(
        pymupdf.Rect(center_x - 135, seal_y - 35, center_x + 135, seal_y + 35),
        "VERIFIED CREDENTIAL\n100% GRAPH MASTERY",
        fontsize=13,
        fontname="hebo",
        color=GOLD,
        align=1
    )

    # Right: Institutional Authority & Signatory
    page.insert_textbox(
        pymupdf.Rect(width - 580, 830, width - 180, 885),
        "Dr. A. Vance",
        fontsize=32,
        fontname="heit",
        color=NAVY,
        align=2  # Right aligned
    )
    page.draw_line(pymupdf.Point(width - 580, 890), pymupdf.Point(width - 180, 890), color=MUTED, width=1.5)
    page.insert_textbox(
        pymupdf.Rect(width - 580, 905, width - 180, 990),
        "Chief Academic Officer\nEduGraph Academic & Verification Authority",
        fontsize=16,
        fontname="helv",
        color=DARK_TEXT,
        align=2  # Right aligned
    )

    # 9. Output Stream Buffer
    buffer = BytesIO()
    if output_format.lower() == "pdf":
        buffer.write(doc.tobytes())
    else:
        pix = page.get_pixmap(dpi=150)
        buffer.write(pix.tobytes("png"))

    doc.close()
    buffer.seek(0)
    return buffer
