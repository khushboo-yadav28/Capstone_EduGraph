# import os
# from io import BytesIO
# from datetime import datetime
# from PIL import Image, ImageDraw, ImageFont

# def generate_course_certificate(student_name: str, course_title: str, completion_date: datetime) -> BytesIO:
#     """
#     Generates a stylized certificate image dynamically embedding student name, 
#     course title, and formatted completion date.
#     """
#     # 1. Create a blank certificate canvas (Landscape 1920x1080)
#     width, height = 1920, 1080
#     cert = Image.new("RGB", (width, height), color="#FBFBFB")
#     draw = ImageDraw.Draw(cert)

#     # 2. Draw Elegant Border & Background Styling
#     # Outer dark border
#     draw.rectangle([40, 40, width - 40, height - 40], outline="#1E293B", width=6)
#     # Inner gold/accent border
#     draw.rectangle([60, 60, width - 60, height - 60], outline="#D97706", width=2)

#     # 3. Load Fonts (Falling back to default if custom ttf is missing)
#     try:
#         # You can place a professional .ttf font file in your backend/assets folder
#         font_title = ImageFont.truetype("arial.ttf", 64)
#         font_subtitle = ImageFont.truetype("arial.ttf", 32)
#         font_name = ImageFont.truetype("arial.ttf", 80)
#         font_body = ImageFont.truetype("arial.ttf", 28)
#         font_date = ImageFont.truetype("arial.ttf", 30)
#     except IOError:
#         font_title = ImageFont.load_default()
#         font_subtitle = ImageFont.load_default()
#         font_name = ImageFont.load_default()
#         font_body = ImageFont.load_default()
#         font_date = ImageFont.load_default()

#     # 4. Draw Header / Platform Branding
#     draw.text((width / 2, 140), "EDUGRAPH LEARNING ECOSYSTEM", fill="#64748B", anchor="mm", font=font_subtitle)
#     draw.text((width / 2, 230), "CERTIFICATE OF COMPLETION", fill="#1E293B", anchor="mm", font=font_title)

#     # 5. Body Text
#     draw.text((width / 2, 370), "This is proudly presented to", fill="#475569", anchor="mm", font=font_body)

#     # 6. Student Name (Highlighted / Bold styling simulation)
#     draw.text((width / 2, 480), student_name.upper(), fill="#0F172A", anchor="mm", font=font_name)
    
#     # Underline for student name
#     name_bbox = draw.textbbox((width / 2, 480), student_name.upper(), font=font_name, anchor="mm")
#     draw.line([name_bbox[0] - 40, name_bbox[3] + 15, name_bbox[2] + 40, name_bbox[3] + 15], fill="#D97706", width=4)

#     # 7. Course Details
#     draw.text((width / 2, 630), "for successfully mastering and completing the curriculum requirements for", fill="#475569", anchor="mm", font=font_body)
#     draw.text((width / 2, 720), course_title, fill="#2563EB", anchor="mm", font=font_subtitle)

#     # 8. Footer Section (Date & Verification Metadata)
#     formatted_date = completion_date.strftime("%B %d, %Y")
    
#     # Left side: Issue Date
#     draw.text((350, 900), f"Date Issued: {formatted_date}", fill="#334155", anchor="lm", font=font_date)
#     draw.line([350, 870, 650, 870], fill="#94A3B8", width=2)
#     draw.text((350, 940), "Authorized Signature", fill="#64748B", anchor="lm", font=font_body)

#     # Right side: Verification Badge text
#     draw.text((width - 350, 900), "Verified Secure Credential", fill="#16A34A", anchor="rm", font=font_date)
#     draw.line([width - 650, 870, width - 350, 870], fill="#94A3B8", width=2)
#     draw.text((width - 350, 940), "Edugraph Academic Authority", fill="#64748B", anchor="rm", font=font_body)

#     # 9. Save image into a binary stream buffer
#     buffer = BytesIO()
#     cert.save(buffer, format="PNG")
#     buffer.seek(0)
#     return buffer

import os
from io import BytesIO
from datetime import datetime
from PIL import Image, ImageDraw, ImageFont

def generate_course_certificate(student_name: str, course_title: str, completion_date: datetime) -> BytesIO:
    """
    Generates a stylized certificate image dynamically embedding student name, 
    course title, formatted completion date, and an institutional signature block.
    """
    # 1. Create a blank certificate canvas (Landscape 1920x1080)
    width, height = 1920, 1080
    cert = Image.new("RGB", (width, height), color="#FBFBFB")
    draw = ImageDraw.Draw(cert)

    # 2. Draw Elegant Border & Background Styling
    draw.rectangle([40, 40, width - 40, height - 40], outline="#1E293B", width=6)
    draw.rectangle([60, 60, width - 60, height - 60], outline="#D97706", width=2)

    # 3. Load Fonts (Falling back to default if custom ttf is missing)
    try:
        font_title = ImageFont.truetype("arial.ttf", 64)
        font_subtitle = ImageFont.truetype("arial.ttf", 32)
        font_name = ImageFont.truetype("arial.ttf", 80)
        font_body = ImageFont.truetype("arial.ttf", 28)
        font_date = ImageFont.truetype("arial.ttf", 30)
        font_sig = ImageFont.truetype("arial.ttf", 36) # For signature simulation
    except IOError:
        font_title = ImageFont.load_default()
        font_subtitle = ImageFont.load_default()
        font_name = ImageFont.load_default()
        font_body = ImageFont.load_default()
        font_date = ImageFont.load_default()
        font_sig = ImageFont.load_default()

    # 4. Draw Header / Platform Branding
    draw.text((width / 2, 140), "EDUGRAPH LEARNING ECOSYSTEM", fill="#64748B", anchor="mm", font=font_subtitle)
    draw.text((width / 2, 230), "CERTIFICATE OF COMPLETION", fill="#1E293B", anchor="mm", font=font_title)

    # 5. Body Text
    draw.text((width / 2, 370), "This is proudly presented to", fill="#475569", anchor="mm", font=font_body)

    # 6. Student Name
    draw.text((width / 2, 480), student_name.upper(), fill="#0F172A", anchor="mm", font=font_name)
    
    name_bbox = draw.textbbox((width / 2, 480), student_name.upper(), font=font_name, anchor="mm")
    draw.line([name_bbox[0] - 40, name_bbox[3] + 15, name_bbox[2] + 40, name_bbox[3] + 15], fill="#D97706", width=4)

    # 7. Course Details
    draw.text((width / 2, 630), "for successfully mastering and completing the curriculum requirements for", fill="#475569", anchor="mm", font=font_body)
    draw.text((width / 2, 720), course_title, fill="#2563EB", anchor="mm", font=font_subtitle)

    # 8. Footer Section (Date & Authorized Signature Block)
    formatted_date = completion_date.strftime("%B %d, %Y")
    
    # Left side: Issue Date
    draw.text((350, 900), f"Date Issued: {formatted_date}", fill="#334155", anchor="lm", font=font_date)
    draw.line([350, 870, 650, 870], fill="#94A3B8", width=2)
    draw.text((350, 940), "Date of Issuance", fill="#64748B", anchor="lm", font=font_body)

    # Right side: Authorized Signature block with a simulated sign
    draw.text((width - 500, 845), "Dr. A. Vance", fill="#1E3A8A", anchor="lm", font=font_sig) # Simulated signature text
    draw.line([width - 650, 870, width - 350, 870], fill="#94A3B8", width=2)
    draw.text((width - 500, 910), "Chief Academic Officer", fill="#1E293B", anchor="lm", font=font_date)
    draw.text((width - 500, 945), "Edugraph Authorized Signatory", fill="#64748B", anchor="lm", font=font_body)

    # 9. Save image into a binary stream buffer
    buffer = BytesIO()
    cert.save(buffer, format="PNG")
    buffer.seek(0)
    return buffer