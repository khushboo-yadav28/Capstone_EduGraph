# app/api/courses.py

from datetime import datetime, timezone, timedelta

from pathlib import Path

import re

from typing import Any, Dict, List, Optional, Set

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status, Response
import io
import zipfile
import pymupdf

from fastapi.responses import FileResponse

from sqlalchemy import func

from sqlalchemy.orm import Session, joinedload



from app.core.config import settings

from app.database import get_db

from app.models.user import User, UserRole, StudentProfile

from app.models.course import Category, Course, CourseStatus, Edge, Node, UserCourseEnrollment, CourseDocument, DocumentChunk, Badge, EnrollmentStatus

from app.models.quiz import QuizAttempt, StudentProgress

from app.schemas.course import (

    CourseCreate,

    CourseDetailResponse,

    CourseResponse,

    CategoryCreate,

    CategoryResponse,

    CourseDocumentResponse,

    CourseDocumentListResponse,

    RAGContextResponse,

)

from app.services import course_service

from app.services.enrollment_service import evaluate_sequential_student_progress

from pydantic import BaseModel

from app.services.gemini_service import (

    answer_student_doubt,

    extract_course_graph_from_pdf,

    extract_course_graph_from_multiple_pdfs,

    extract_text_chunks_from_pdf,

    generate_embeddings_for_chunks,

)

from app.core.security import get_current_user, require_roles

from app.schemas.node_graph import CourseGraphResponse, GraphNodeResponse, GraphEdgeResponse, NodeProgressStatus



router = APIRouter(prefix="/courses", tags=["Courses & Graph"])





# --- Category Endpoints ---

@router.post("/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)

def create_category_endpoint(

    category_data: CategoryCreate,

    db: Session = Depends(get_db),

    current_user: User = Depends(require_roles([UserRole.ADMIN]))

):

    """Creates a new course category (Admin only)."""

    return course_service.create_category(db, category_data, current_user)





@router.get("/categories", response_model=List[CategoryResponse])

def get_categories_endpoint(db: Session = Depends(get_db)):

    """Retrieves all course categories (Public)."""

    return course_service.get_all_categories(db)





@router.get("/admin/stats")
def get_admin_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    """Returns dynamic counts and platform-wide top course metrics for the Admin Dashboard."""
    total_users = db.query(User).filter(User.is_active == True).count()
    total_categories = db.query(Category).count()
    total_courses = db.query(Course).filter(Course.status == CourseStatus.PUBLISHED).count()

    all_published_courses = (
        db.query(Course)
        .options(joinedload(Course.instructor), joinedload(Course.category))
        .filter(Course.status == CourseStatus.PUBLISHED)
        .all()
    )

    popular_course_data = None
    most_completed_data = None
    all_popular_courses = []

    max_enrollments = -1
    top_pop_course = None

    max_completions = -1
    top_comp_course = None
    top_comp_enrollments = 0

    for c in all_published_courses:
        enrolled_count = (
            db.query(func.count(UserCourseEnrollment.id))
            .filter(UserCourseEnrollment.course_id == c.id)
            .scalar() or 0
        )
        active_count = (
            db.query(func.count(UserCourseEnrollment.id))
            .filter(
                UserCourseEnrollment.course_id == c.id,
                UserCourseEnrollment.status == EnrollmentStatus.IN_PROGRESS
            )
            .scalar() or 0
        )
        completed_count = (
            db.query(func.count(UserCourseEnrollment.id))
            .filter(
                UserCourseEnrollment.course_id == c.id,
                (UserCourseEnrollment.status == EnrollmentStatus.COMPLETED) | (UserCourseEnrollment.progress_percentage >= 100.0)
            )
            .scalar() or 0
        )

        all_popular_courses.append({
            "id": str(c.id),
            "title": c.title,
            "instructor_name": c.instructor.full_name if c.instructor else "Instructor",
            "category_name": c.category.name if c.category else "General",
            "total_enrollments": enrolled_count,
            "active_students_count": active_count,
            "completed_students_count": completed_count,
            "completion_rate": round((completed_count / enrolled_count) * 100.0, 1) if enrolled_count > 0 else 0.0
        })

        if enrolled_count > max_enrollments and enrolled_count > 0:
            max_enrollments = enrolled_count
            top_pop_course = c

        if completed_count > max_completions and completed_count > 0:
            max_completions = completed_count
            top_comp_course = c
            top_comp_enrollments = enrolled_count

    all_popular_courses.sort(key=lambda x: x["total_enrollments"], reverse=True)

    if top_pop_course:
        pop_active = (
            db.query(func.count(UserCourseEnrollment.id))
            .filter(
                UserCourseEnrollment.course_id == top_pop_course.id,
                UserCourseEnrollment.status == EnrollmentStatus.IN_PROGRESS
            )
            .scalar() or 0
        )
        popular_course_data = {
            "id": str(top_pop_course.id),
            "title": top_pop_course.title,
            "instructor_name": top_pop_course.instructor.full_name if top_pop_course.instructor else "Instructor",
            "category_name": top_pop_course.category.name if top_pop_course.category else "General",
            "total_enrollments": max_enrollments,
            "active_students_count": pop_active
        }

    if top_comp_course:
        most_completed_data = {
            "id": str(top_comp_course.id),
            "title": top_comp_course.title,
            "instructor_name": top_comp_course.instructor.full_name if top_comp_course.instructor else "Instructor",
            "category_name": top_comp_course.category.name if top_comp_course.category else "General",
            "completed_students_count": max_completions,
            "total_enrollments": top_comp_enrollments,
            "completion_rate": round((max_completions / top_comp_enrollments) * 100.0, 1) if top_comp_enrollments > 0 else 0.0
        }
    
    return {
        "total_users": total_users,
        "total_categories": total_categories,
        "total_courses": total_courses,
        "popular_course": popular_course_data,
        "most_completed_course": most_completed_data,
        "all_popular_courses": all_popular_courses
    }


@router.get("/admin/courses/{course_id}/graduates")
def get_course_graduates(
    course_id: UUID,
    preset: Optional[str] = Query(None, description="Preset filter: 'same_day', 'within_1_day', '1_week', '1_month', 'all'"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD or ISO string)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD or ISO string)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    """
    Returns the list of graduated students for a specific course with dynamic date filtering
    based on the student's badge issue date (issued_at) or completion timestamp.
    """
    course = db.query(Course).options(joinedload(Course.instructor)).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")

    query = (
        db.query(UserCourseEnrollment)
        .options(
            joinedload(UserCourseEnrollment.student).joinedload(User.student_profile),
            joinedload(UserCourseEnrollment.badge)
        )
        .filter(
            UserCourseEnrollment.course_id == course_id,
            (UserCourseEnrollment.status == EnrollmentStatus.COMPLETED) | (UserCourseEnrollment.progress_percentage >= 100.0)
        )
    )

    all_grad_enrollments = query.all()
    total_graduates = len(all_grad_enrollments)

    now = datetime.now(timezone.utc)
    filter_start = None
    filter_end = None

    if preset == "same_day":
        filter_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif preset == "within_1_day":
        filter_start = now - timedelta(days=1)
    elif preset == "1_week":
        filter_start = now - timedelta(days=7)
    elif preset == "1_month":
        filter_start = now - timedelta(days=30)

    if start_date:
        try:
            if len(start_date) == 10:
                filter_start = datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            else:
                filter_start = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
        except Exception:
            pass

    if end_date:
        try:
            if len(end_date) == 10:
                filter_end = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59, microsecond=999999, tzinfo=timezone.utc)
            else:
                filter_end = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
        except Exception:
            pass

    graduates_list = []
    for enr in all_grad_enrollments:
        student = enr.student
        badge = enr.badge
        prof = student.student_profile if student else None

        issue_date = None
        if badge and badge.issued_at:
            issue_date = badge.issued_at
        elif enr.completed_at:
            issue_date = enr.completed_at
        else:
            issue_date = enr.enrolled_at or now

        if issue_date and issue_date.tzinfo is None:
            issue_date = issue_date.replace(tzinfo=timezone.utc)

        if filter_start and issue_date and issue_date < filter_start:
            continue
        if filter_end and issue_date and issue_date > filter_end:
            continue

        graduates_list.append({
            "student_id": str(student.id) if student else "",
            "student_name": student.full_name if student else "Unknown Student",
            "email": student.email if student else "N/A",
            "enrollment_number": prof.enrollment_number if prof and prof.enrollment_number else "N/A",
            "department": prof.department if prof and prof.department else "N/A",
            "program": prof.program if prof and prof.program else "N/A",
            "semester": prof.semester if prof and prof.semester else "N/A",
            "badge_title": badge.badge_title if badge else f"Master of {course.title}",
            "badge_image_url": badge.badge_image_url if badge else "/default-badge.png",
            "badge_issued_at": issue_date.isoformat() if issue_date else None,
            "progress_percentage": enr.progress_percentage or 100.0,
            "status": enr.status.value if hasattr(enr.status, "value") else str(enr.status)
        })

    graduates_list.sort(key=lambda x: x["badge_issued_at"] or "", reverse=True)

    return {
        "course_id": str(course.id),
        "course_title": course.title,
        "instructor_name": course.instructor.full_name if course.instructor else "Platform Instructor",
        "total_graduates": total_graduates,
        "filtered_count": len(graduates_list),
        "preset": preset,
        "filter_start": filter_start.isoformat() if filter_start else None,
        "filter_end": filter_end.isoformat() if filter_end else None,
        "graduates": graduates_list
    }


@router.get("/admin/adoption")
def get_admin_course_adoption_metrics(
    preset: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    category_id: Optional[str] = None,
    category_name: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    """
    Platform-Wide Course Adoption and Popularity Metrics with dynamic multi-filtering capabilities:
    - Enrolled Date Filter: based on student enrollment timestamps (enrolled_at)
    - Category-Wise Filter: taxonomy categories
    - Returns summary KPIs: Total Active Learners, Average Completion Rate, Top Performing Category,
      and sorted course adoption metrics.
    """
    now = datetime.now(timezone.utc)
    filter_start = None
    filter_end = None

    if isinstance(preset, str):
        if preset == "today":
            filter_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif preset == "7_days":
            filter_start = now - timedelta(days=7)
        elif preset == "30_days":
            filter_start = now - timedelta(days=30)

    if isinstance(start_date, str) and start_date.strip():
        try:
            cleaned = start_date.strip()
            if len(cleaned) == 10:
                filter_start = datetime.strptime(cleaned, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            else:
                filter_start = datetime.fromisoformat(cleaned.replace("Z", "+00:00"))
        except Exception:
            pass

    if isinstance(end_date, str) and end_date.strip():
        try:
            cleaned = end_date.strip()
            if len(cleaned) == 10:
                filter_end = datetime.strptime(cleaned, "%Y-%m-%d").replace(hour=23, minute=59, second=59, microsecond=999999, tzinfo=timezone.utc)
            else:
                filter_end = datetime.fromisoformat(cleaned.replace("Z", "+00:00"))
        except Exception:
            pass

    courses_query = (
        db.query(Course)
        .options(joinedload(Course.instructor), joinedload(Course.category))
        .filter(Course.status == CourseStatus.PUBLISHED)
    )

    if category_id and isinstance(category_id, (str, UUID)):
        courses_query = courses_query.filter(Course.category_id == category_id)

    all_published = courses_query.all()

    # Extract all distinct category names across all published courses
    all_cat_names = sorted(list({
        c.category.name for c in all_published if c.category and c.category.name
    }))

    # If category_name filter is applied and not 'all'
    if isinstance(category_name, str) and category_name.strip() and category_name.lower() != "all":
        all_published = [
            c for c in all_published 
            if c.category and c.category.name.lower() == category_name.strip().lower()
        ]

    course_items = []
    total_active_learners = 0
    total_enrolled_count = 0
    total_completed_count = 0
    category_enrollment_map: Dict[str, int] = {}

    for c in all_published:
        enr_query = db.query(UserCourseEnrollment).filter(UserCourseEnrollment.course_id == c.id)

        if filter_start:
            enr_query = enr_query.filter(UserCourseEnrollment.enrolled_at >= filter_start)
        if filter_end:
            enr_query = enr_query.filter(UserCourseEnrollment.enrolled_at <= filter_end)

        enrollments = enr_query.all()
        total_enrolled = len(enrollments)
        active_count = sum(1 for e in enrollments if e.status == EnrollmentStatus.IN_PROGRESS)
        completed_count = sum(
            1 for e in enrollments 
            if (e.status == EnrollmentStatus.COMPLETED or (e.progress_percentage or 0.0) >= 100.0)
        )
        completion_rate = round((completed_count / total_enrolled) * 100.0, 1) if total_enrolled > 0 else 0.0

        cat_name = c.category.name if c.category else "General"
        category_enrollment_map[cat_name] = category_enrollment_map.get(cat_name, 0) + total_enrolled

        total_enrolled_count += total_enrolled
        total_active_learners += active_count
        total_completed_count += completed_count

        course_items.append({
            "id": str(c.id),
            "title": c.title,
            "description": c.description or "",
            "instructor_name": c.instructor.full_name if c.instructor else "Platform Instructor",
            "category_name": cat_name,
            "total_enrollments": total_enrolled,
            "active_students_count": active_count,
            "completed_students_count": completed_count,
            "completion_rate": completion_rate
        })

    course_items.sort(key=lambda x: x["total_enrollments"], reverse=True)

    top_performing_category = "N/A"
    if category_enrollment_map:
        sorted_cats = sorted(category_enrollment_map.items(), key=lambda x: x[1], reverse=True)
        if sorted_cats[0][1] > 0:
            top_performing_category = sorted_cats[0][0]
        else:
            top_performing_category = sorted_cats[0][0]

    overall_avg_completion = (
        round((total_completed_count / total_enrolled_count) * 100.0, 1)
        if total_enrolled_count > 0 else 0.0
    )

    return {
        "filter_metadata": {
            "preset": preset or "all",
            "filter_start": filter_start.isoformat() if filter_start else None,
            "filter_end": filter_end.isoformat() if filter_end else None,
            "category_name": category_name or "all",
            "available_categories": all_cat_names
        },
        "kpis": {
            "total_active_learners": total_active_learners,
            "avg_completion_rate": overall_avg_completion,
            "top_performing_category": top_performing_category,
            "total_enrolled_count": total_enrolled_count,
            "total_courses_count": len(course_items)
        },
        "courses": course_items
    }


def _generate_adoption_excel(filter_info: Dict[str, Any], kpis: Dict[str, Any], courses: List[Dict[str, Any]]) -> bytes:
    content_types = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>"""

    rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>"""

    wb_rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>"""

    workbook = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Course Adoption Report" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>"""

    styles = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="6">
    <font><name val="Calibri"/><sz val="11"/></font>
    <font><b/><color rgb="FF112217"/><name val="Calibri"/><sz val="15"/></font>
    <font><i/><color rgb="FF4A6B5D"/><name val="Calibri"/><sz val="10"/></font>
    <font><b/><color rgb="FF112217"/><name val="Calibri"/><sz val="10"/></font>
    <font><b/><color rgb="FFFFFFFF"/><name val="Calibri"/><sz val="11"/></font>
    <font><color rgb="FF112217"/><name val="Calibri"/><sz val="10"/></font>
  </fonts>
  <fills count="5">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF112217"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFD3EFDC"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF4F7F4"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/></border>
    <border>
      <left style="thin"><color rgb="FFE2EAE4"/></left>
      <right style="thin"><color rgb="FFE2EAE4"/></right>
      <top style="thin"><color rgb="FFE2EAE4"/></top>
      <bottom style="thin"><color rgb="FFE2EAE4"/></bottom>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="8">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
    <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
    <xf numFmtId="0" fontId="3" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="0" fontId="4" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="5" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/>
    <xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="5" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
  </cellXfs>
</styleSheet>"""

    rows_xml = []
    rows_xml.append('<row r="1"><c r="A1" s="1" t="inlineStr"><is><t>EduGraph LMS - Platform Course Adoption &amp; Popularity Report</t></is></c></row>')
    
    meta_desc = f"Generated: {filter_info.get('timestamp', '')} | Filter Window: {filter_info.get('window', 'All Time')} | Category: {filter_info.get('category', 'All Categories')}"
    rows_xml.append(f'<row r="2"><c r="A2" s="2" t="inlineStr"><is><t>{meta_desc}</t></is></c></row>')

    rows_xml.append(f"""<row r="4">
      <c r="A4" s="3" t="inlineStr"><is><t>Total Active Learners: {kpis.get("total_active_learners", 0)}</t></is></c>
      <c r="C4" s="3" t="inlineStr"><is><t>Average Completion Rate: {kpis.get("avg_completion_rate", 0)}%</t></is></c>
      <c r="E4" s="3" t="inlineStr"><is><t>Top Performing Category: {kpis.get("top_performing_category", "N/A")}</t></is></c>
      <c r="G4" s="3" t="inlineStr"><is><t>Total Enrolled Registrations: {kpis.get("total_enrolled_count", 0)}</t></is></c>
    </row>""")

    rows_xml.append("""<row r="6">
      <c r="A6" s="4" t="inlineStr"><is><t>Rank</t></is></c>
      <c r="B6" s="4" t="inlineStr"><is><t>Course Title</t></is></c>
      <c r="C6" s="4" t="inlineStr"><is><t>Instructor</t></is></c>
      <c r="D6" s="4" t="inlineStr"><is><t>Category</t></is></c>
      <c r="E6" s="4" t="inlineStr"><is><t>Total Enrolled</t></is></c>
      <c r="F6" s="4" t="inlineStr"><is><t>Active Learners</t></is></c>
      <c r="G6" s="4" t="inlineStr"><is><t>Completions</t></is></c>
      <c r="H6" s="4" t="inlineStr"><is><t>Completion Rate</t></is></c>
    </row>""")

    row_idx = 7
    for i, c in enumerate(courses):
        bg_s = 7 if i % 2 == 1 else 5
        rank = i + 1
        title_esc = str(c.get('title', '')).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        inst_esc = str(c.get('instructor_name', '')).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        cat_esc = str(c.get('category_name', '')).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        total_enr = c.get('total_enrollments', 0)
        active_cnt = c.get('active_students_count', 0)
        comp_cnt = c.get('completed_students_count', 0)
        rate = c.get('completion_rate', 0.0)

        rows_xml.append(f"""<row r="{row_idx}">
          <c r="A{row_idx}" s="6"><v>{rank}</v></c>
          <c r="B{row_idx}" s="{bg_s}" t="inlineStr"><is><t>{title_esc}</t></is></c>
          <c r="C{row_idx}" s="{bg_s}" t="inlineStr"><is><t>{inst_esc}</t></is></c>
          <c r="D{row_idx}" s="{bg_s}" t="inlineStr"><is><t>{cat_esc}</t></is></c>
          <c r="E{row_idx}" s="{bg_s}"><v>{total_enr}</v></c>
          <c r="F{row_idx}" s="{bg_s}"><v>{active_cnt}</v></c>
          <c r="G{row_idx}" s="{bg_s}"><v>{comp_cnt}</v></c>
          <c r="H{row_idx}" s="{bg_s}" t="inlineStr"><is><t>{rate}%</t></is></c>
        </row>""")
        row_idx += 1

    sheet = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cols>
    <col min="1" max="1" width="8" customWidth="1"/>
    <col min="2" max="2" width="34" customWidth="1"/>
    <col min="3" max="3" width="24" customWidth="1"/>
    <col min="4" max="4" width="22" customWidth="1"/>
    <col min="5" max="5" width="16" customWidth="1"/>
    <col min="6" max="6" width="16" customWidth="1"/>
    <col min="7" max="7" width="16" customWidth="1"/>
    <col min="8" max="8" width="18" customWidth="1"/>
  </cols>
  <sheetData>
    {''.join(rows_xml)}
  </sheetData>
</worksheet>"""

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
        zf.writestr('[Content_Types].xml', content_types)
        zf.writestr('_rels/.rels', rels)
        zf.writestr('xl/_rels/workbook.xml.rels', wb_rels)
        zf.writestr('xl/workbook.xml', workbook)
        zf.writestr('xl/styles.xml', styles)
        zf.writestr('xl/worksheets/sheet1.xml', sheet)

    return buf.getvalue()


def _generate_adoption_pdf(filter_info: Dict[str, Any], kpis: Dict[str, Any], courses: List[Dict[str, Any]]) -> bytes:
    doc = pymupdf.open()
    page_width = 842.0
    page_height = 595.0

    C_DARK = (17/255, 34/255, 23/255)       # #112217
    C_MINT = (211/255, 239/255, 220/255)    # #d3efdc
    C_MINT_BORDER = (188/255, 232/255, 201/255) # #bce8c9
    C_BG_ROW = (244/255, 247/255, 244/255)  # #f4f7f4
    C_BORDER = (226/255, 234/255, 228/255)  # #e2eae4
    C_WHITE = (1.0, 1.0, 1.0)
    C_MUTED = (74/255, 107/255, 93/255)     # #4a6b5d

    margin_x = 36.0
    usable_width = page_width - 2 * margin_x

    def create_page():
        page = doc.new_page(width=page_width, height=page_height)
        page.draw_rect(pymupdf.Rect(0, 0, page_width, 56), color=None, fill=C_DARK)
        page.insert_text((margin_x, 24), "EDUGRAPH LMS • INSTITUTIONAL COURSEWARE INTELLIGENCE SUITE", fontsize=9, fontname="helv", color=C_MINT)
        page.insert_text((margin_x, 44), "Platform Course Adoption & Popularity Analytics Report", fontsize=15, fontname="helv", color=C_WHITE)
        
        page.draw_line(pymupdf.Point(margin_x, page_height - 28), pymupdf.Point(page_width - margin_x, page_height - 28), color=C_BORDER, width=0.8)
        page.insert_text((margin_x, page_height - 14), "GLS University • Faculty of Computer Applications & IT • EduGraph Adaptive Courseware System", fontsize=8, fontname="helv", color=C_MUTED)
        page.insert_text((page_width - margin_x - 70, page_height - 14), f"Page {len(doc)}", fontsize=8, fontname="helv", color=C_MUTED)
        return page

    current_page = create_page()
    cursor_y = 70.0

    meta_rect = pymupdf.Rect(margin_x, cursor_y, page_width - margin_x, cursor_y + 26)
    current_page.draw_rect(meta_rect, color=C_MINT_BORDER, fill=C_MINT)
    meta_str = f"Generated: {filter_info.get('timestamp', 'N/A')}  |  Enrolled Date Filter: {filter_info.get('window', 'All Time')}  |  Category: {filter_info.get('category', 'All Categories')}  |  Total Matching Courses: {len(courses)}"
    current_page.insert_text((margin_x + 12, cursor_y + 17), meta_str, fontsize=8.5, fontname="helv", color=C_DARK)
    cursor_y += 34.0

    kpi_w = (usable_width - 3 * 10) / 4.0
    kpi_h = 44.0
    kpi_items = [
        ("TOTAL ACTIVE LEARNERS", str(kpis.get("total_active_learners", 0)), "Actively progressing students"),
        ("AVG COMPLETION RATE", f"{kpis.get('avg_completion_rate', 0)}%", "Across filtered courses"),
        ("TOP PERFORMING CATEGORY", str(kpis.get("top_performing_category", "N/A"))[:20], "Leading student adoption"),
        ("TOTAL ENROLLMENTS", str(kpis.get("total_enrolled_count", 0)), f"Across {len(courses)} courses")
    ]

    for idx, (label, val, sub) in enumerate(kpi_items):
        kx = margin_x + idx * (kpi_w + 10)
        card_rect = pymupdf.Rect(kx, cursor_y, kx + kpi_w, cursor_y + kpi_h)
        current_page.draw_rect(card_rect, color=C_BORDER, fill=C_WHITE)
        current_page.insert_text((kx + 8, cursor_y + 13), label, fontsize=6.5, fontname="helv", color=C_MUTED)
        current_page.insert_text((kx + 8, cursor_y + 28), val, fontsize=12, fontname="helv", color=C_DARK)
        current_page.insert_text((kx + 8, cursor_y + 39), sub, fontsize=6.5, fontname="helv", color=C_MUTED)

    cursor_y += kpi_h + 16.0

    cols = [
        ("Rank", 36.0, "center"),
        ("Course Title", 210.0, "left"),
        ("Instructor", 140.0, "left"),
        ("Category", 130.0, "left"),
        ("Total Enrolled", 80.0, "center"),
        ("Active", 60.0, "center"),
        ("Completions", 65.0, "center"),
        ("Completion Rate", 85.0, "center")
    ]
    total_col_w = sum(c[1] for c in cols)
    ratio = usable_width / total_col_w
    cols = [(c[0], c[1] * ratio, c[2]) for c in cols]

    def draw_table_header(page, y):
        header_rect = pymupdf.Rect(margin_x, y, page_width - margin_x, y + 22)
        page.draw_rect(header_rect, color=None, fill=C_DARK)
        x = margin_x
        for title, w, align in cols:
            if align == "center":
                tw = pymupdf.get_text_length(title, fontname="helv", fontsize=8)
                tx = x + (w - tw) / 2.0
            else:
                tx = x + 6.0
            page.insert_text((tx, y + 14), title, fontsize=8, fontname="helv", color=C_WHITE)
            x += w
        return y + 22.0

    cursor_y = draw_table_header(current_page, cursor_y)
    row_height = 20.0

    for idx, c in enumerate(courses):
        if cursor_y + row_height > page_height - 45.0:
            current_page = create_page()
            cursor_y = 66.0
            cursor_y = draw_table_header(current_page, cursor_y)

        row_fill = C_BG_ROW if idx % 2 == 1 else C_WHITE
        row_rect = pymupdf.Rect(margin_x, cursor_y, page_width - margin_x, cursor_y + row_height)
        current_page.draw_rect(row_rect, color=C_BORDER, fill=row_fill)

        row_data = [
            f"#{idx + 1}",
            str(c.get("title", ""))[:38],
            str(c.get("instructor_name", ""))[:25],
            str(c.get("category_name", ""))[:22],
            str(c.get("total_enrollments", 0)),
            str(c.get("active_students_count", 0)),
            str(c.get("completed_students_count", 0)),
            f"{c.get('completion_rate', 0)}%"
        ]

        x = margin_x
        for cell_idx, ((col_name, w, align), text) in enumerate(zip(cols, row_data)):
            font_size = 7.5
            font_color = C_DARK if cell_idx in [0, 1, 4, 7] else C_MUTED
            if align == "center":
                tw = pymupdf.get_text_length(text, fontname="helv", fontsize=font_size)
                tx = x + (w - tw) / 2.0
            else:
                tx = x + 6.0
            current_page.insert_text((tx, cursor_y + 13), text, fontsize=font_size, fontname="helv", color=font_color)
            x += w

        cursor_y += row_height

    return doc.tobytes()


@router.get("/admin/adoption/export/excel")
def export_admin_course_adoption_excel(
    preset: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    category_id: Optional[str] = None,
    category_name: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    """
    Exports filtered course adoption & popularity metrics as an Excel (.xlsx) spreadsheet
    matching the institutional dark green and mint theme.
    """
    data = get_admin_course_adoption_metrics(
        preset=preset,
        start_date=start_date,
        end_date=end_date,
        category_id=category_id,
        category_name=category_name,
        db=db,
        current_user=current_user
    )

    courses = data["courses"]
    if search and isinstance(search, str) and search.strip():
        q = search.strip().lower()
        courses = [
            c for c in courses 
            if q in c["title"].lower() or q in c["instructor_name"].lower() or q in c["category_name"].lower()
        ]

    window_label = "All Time"
    if preset == "today":
        window_label = "Today"
    elif preset == "7_days":
        window_label = "Last 7 Days"
    elif preset == "30_days":
        window_label = "Last 30 Days"
    elif start_date or end_date:
        window_label = f"{start_date or 'Start'} to {end_date or 'Present'}"

    cat_label = category_name if category_name and category_name.lower() != "all" else "All Categories"
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    filter_info = {
        "timestamp": now_str,
        "window": window_label,
        "category": cat_label,
        "search": search or ""
    }

    excel_bytes = _generate_adoption_excel(filter_info, data["kpis"], courses)
    date_tag = datetime.now(timezone.utc).strftime("%Y%m%d")
    filename = f"EduGraph_Course_Adoption_Report_{date_tag}.xlsx"

    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )


@router.get("/admin/adoption/export/pdf")
def export_admin_course_adoption_pdf(
    preset: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    category_id: Optional[str] = None,
    category_name: Optional[str] = None,
    search: Optional[str] = None,
    inline: Optional[bool] = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    """
    Exports filtered course adoption & popularity metrics as a PDF document
    with institutional styling, header banners, KPI summaries, and tabular layout.
    """
    data = get_admin_course_adoption_metrics(
        preset=preset,
        start_date=start_date,
        end_date=end_date,
        category_id=category_id,
        category_name=category_name,
        db=db,
        current_user=current_user
    )

    courses = data["courses"]
    if search and isinstance(search, str) and search.strip():
        q = search.strip().lower()
        courses = [
            c for c in courses 
            if q in c["title"].lower() or q in c["instructor_name"].lower() or q in c["category_name"].lower()
        ]

    window_label = "All Time"
    if preset == "today":
        window_label = "Today"
    elif preset == "7_days":
        window_label = "Last 7 Days"
    elif preset == "30_days":
        window_label = "Last 30 Days"
    elif start_date or end_date:
        window_label = f"{start_date or 'Start'} to {end_date or 'Present'}"

    cat_label = category_name if category_name and category_name.lower() != "all" else "All Categories"
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    filter_info = {
        "timestamp": now_str,
        "window": window_label,
        "category": cat_label,
        "search": search or ""
    }

    pdf_bytes = _generate_adoption_pdf(filter_info, data["kpis"], courses)
    date_tag = datetime.now(timezone.utc).strftime("%Y%m%d")
    filename = f"EduGraph_Course_Adoption_Report_{date_tag}.pdf"
    disposition = "inline" if inline else "attachment"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'{disposition}; filename="{filename}"'
        }
    )


@router.get("/admin/completions")
def get_admin_course_completions_metrics(
    preset: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    category_id: Optional[str] = None,
    category_name: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    """
    Platform-Wide Course Completions & Certified Graduates Metrics with multi-filtering capabilities:
    - Badge Issue Date Filter: All Time, Same Day, Within 1 Day, 1 Week, 1 Month, or Custom Date Range
    - Category-Wise Filter: taxonomy categories
    - Returns courses ranked by completion rate and graduates count, with student details and platform KPIs.
    """
    now = datetime.now(timezone.utc)
    filter_start = None
    filter_end = None

    if isinstance(preset, str):
        if preset == "same_day":
            filter_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif preset == "within_1_day":
            filter_start = now - timedelta(days=1)
        elif preset == "1_week":
            filter_start = now - timedelta(days=7)
        elif preset == "1_month":
            filter_start = now - timedelta(days=30)

    if isinstance(start_date, str) and start_date.strip():
        try:
            cleaned = start_date.strip()
            if len(cleaned) == 10:
                filter_start = datetime.strptime(cleaned, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            else:
                filter_start = datetime.fromisoformat(cleaned.replace("Z", "+00:00"))
        except Exception:
            pass

    if isinstance(end_date, str) and end_date.strip():
        try:
            cleaned = end_date.strip()
            if len(cleaned) == 10:
                filter_end = datetime.strptime(cleaned, "%Y-%m-%d").replace(hour=23, minute=59, second=59, microsecond=999999, tzinfo=timezone.utc)
            else:
                filter_end = datetime.fromisoformat(cleaned.replace("Z", "+00:00"))
        except Exception:
            pass

    courses_query = (
        db.query(Course)
        .options(joinedload(Course.instructor), joinedload(Course.category))
        .filter(Course.status == CourseStatus.PUBLISHED)
    )

    if category_id and isinstance(category_id, (str, UUID)):
        courses_query = courses_query.filter(Course.category_id == category_id)

    all_published = courses_query.all()

    # Extract all distinct category names across all published courses
    all_cat_names = sorted(list({
        c.category.name for c in all_published if c.category and c.category.name
    }))

    # If category_name filter is applied and not 'all'
    if isinstance(category_name, str) and category_name.strip() and category_name.lower() != "all":
        all_published = [
            c for c in all_published 
            if c.category and c.category.name.lower() == category_name.strip().lower()
        ]

    course_items = []
    total_certified_graduates = 0
    total_enrollments_sum = 0
    category_graduates_map: Dict[str, int] = {}

    for c in all_published:
        total_enrolled = (
            db.query(func.count(UserCourseEnrollment.id))
            .filter(UserCourseEnrollment.course_id == c.id)
            .scalar() or 0
        )

        completed_enrollments = (
            db.query(UserCourseEnrollment)
            .options(
                joinedload(UserCourseEnrollment.student).joinedload(User.student_profile),
                joinedload(UserCourseEnrollment.badge)
            )
            .filter(
                UserCourseEnrollment.course_id == c.id,
                (UserCourseEnrollment.status == EnrollmentStatus.COMPLETED) | (UserCourseEnrollment.progress_percentage >= 100.0)
            )
            .all()
        )

        course_graduates = []
        for enr in completed_enrollments:
            student = enr.student
            badge = enr.badge
            prof = student.student_profile if student else None

            issue_date = None
            if badge and badge.issued_at:
                issue_date = badge.issued_at
            elif enr.completed_at:
                issue_date = enr.completed_at
            else:
                issue_date = enr.enrolled_at or now

            if issue_date and issue_date.tzinfo is None:
                issue_date = issue_date.replace(tzinfo=timezone.utc)

            if filter_start and issue_date and issue_date < filter_start:
                continue
            if filter_end and issue_date and issue_date > filter_end:
                continue

            course_graduates.append({
                "student_id": str(student.id) if student else "",
                "student_name": student.full_name if student else "Unknown Student",
                "email": student.email if student else "N/A",
                "enrollment_number": prof.enrollment_number if prof and prof.enrollment_number else "N/A",
                "department": prof.department if prof and prof.department else "N/A",
                "program": prof.program if prof and prof.program else "N/A",
                "semester": prof.semester if prof and prof.semester else "N/A",
                "badge_title": badge.badge_title if badge else f"Master of {c.title}",
                "badge_image_url": badge.badge_image_url if badge else "/default-badge.png",
                "badge_issued_at": issue_date.isoformat() if issue_date else None,
                "progress_percentage": enr.progress_percentage or 100.0,
                "status": enr.status.value if hasattr(enr.status, "value") else str(enr.status)
            })

        course_graduates.sort(key=lambda x: x["badge_issued_at"] or "", reverse=True)
        completed_count = len(course_graduates)
        completion_rate = round((completed_count / total_enrolled) * 100.0, 1) if total_enrolled > 0 else 0.0

        cat_name = c.category.name if c.category else "General"
        category_graduates_map[cat_name] = category_graduates_map.get(cat_name, 0) + completed_count

        total_certified_graduates += completed_count
        total_enrollments_sum += total_enrolled

        course_items.append({
            "id": str(c.id),
            "title": c.title,
            "description": c.description or "",
            "instructor_name": c.instructor.full_name if c.instructor else "Platform Instructor",
            "category_name": cat_name,
            "total_enrollments": total_enrolled,
            "completed_students_count": completed_count,
            "completion_rate": completion_rate,
            "graduates": course_graduates
        })

    course_items.sort(key=lambda x: (x["completed_students_count"], x["completion_rate"]), reverse=True)

    top_performing_category = "N/A"
    if category_graduates_map:
        sorted_cats = sorted(category_graduates_map.items(), key=lambda x: x[1], reverse=True)
        top_performing_category = sorted_cats[0][0]

    top_course_title = "N/A"
    if course_items and course_items[0]["completed_students_count"] > 0:
        top_course_title = course_items[0]["title"]
    elif course_items:
        top_course_title = course_items[0]["title"]

    overall_avg_completion = (
        round((total_certified_graduates / total_enrollments_sum) * 100.0, 1)
        if total_enrollments_sum > 0 else 0.0
    )

    return {
        "filter_metadata": {
            "preset": preset or "all",
            "filter_start": filter_start.isoformat() if filter_start else None,
            "filter_end": filter_end.isoformat() if filter_end else None,
            "category_name": category_name or "all",
            "available_categories": all_cat_names
        },
        "kpis": {
            "total_certified_graduates": total_certified_graduates,
            "avg_completion_rate": overall_avg_completion,
            "top_course_title": top_course_title,
            "top_performing_category": top_performing_category,
            "total_courses_count": len(course_items),
            "total_enrollments_sum": total_enrollments_sum
        },
        "courses": course_items
    }


# --- Course Lifecycle Endpoints ---

@router.post("/", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)

def create_course_endpoint(

    course_data: CourseCreate,

    db: Session = Depends(get_db),

    current_user: User = Depends(require_roles([UserRole.INSTRUCTOR, UserRole.ADMIN]))

):

    """Creates a new draft course shell (Instructors & Admins only)."""

    return course_service.create_course(db, course_data, current_user)





@router.post("/{course_id}/ingest-pdf", response_model=CourseResponse)

async def ingest_pdf_to_course(

    course_id: UUID,

    files: Optional[List[UploadFile]] = File(None),

    file: Optional[UploadFile] = File(None),

    db: Session = Depends(get_db),

    current_user: User = Depends(require_roles([UserRole.INSTRUCTOR, UserRole.ADMIN]))

):

    """

    Uploads single or multiple PDF documents, saves them securely to backend storage,

    records CourseDocument records, chunks & generates embeddings for RAG,

    and extracts knowledge graph nodes, edges, & quizzes into PostgreSQL.

    """

    course = course_service.get_course_by_id(db, course_id)

    if course.instructor_id != current_user.id and current_user.role != UserRole.ADMIN:

        raise HTTPException(

            status_code=status.HTTP_403_FORBIDDEN,

            detail="You do not have permission to modify this course."

        )



    upload_list: List[UploadFile] = []

    if files:

        upload_list.extend(files)

    if file:

        upload_list.append(file)



    if not upload_list:

        raise HTTPException(

            status_code=status.HTTP_400_BAD_REQUEST,

            detail="At least one PDF file must be provided."

        )



    course_upload_dir = settings.UPLOAD_DIR / str(course_id)

    course_upload_dir.mkdir(parents=True, exist_ok=True)



    pdf_payloads: List[tuple[bytes, str]] = []



    for upload_file in upload_list:

        clean_filename = Path(upload_file.filename).name

        safe_filename = re.sub(r'[^a-zA-Z0-9_.-]', '_', clean_filename)

        if not safe_filename.lower().endswith(".pdf"):

            safe_filename += ".pdf"



        pdf_bytes = await upload_file.read()

        if not pdf_bytes:

            continue



        target_path = course_upload_dir / safe_filename

        with open(target_path, "wb") as f_out:

            f_out.write(pdf_bytes)



        course_doc = course_service.save_course_document(

            db=db,

            course_id=course_id,

            file_name=clean_filename,

            file_path=str(target_path),

            file_size=len(pdf_bytes),

            mime_type="application/pdf"

        )



        chunks = extract_text_chunks_from_pdf(pdf_bytes, document_name=clean_filename, chunk_size=1000, chunk_overlap=150)

        if chunks:

            embedded_chunks = generate_embeddings_for_chunks(chunks)

            course_service.save_document_chunks(

                db=db,

                document_id=course_doc.id,

                course_id=course_id,

                chunks=embedded_chunks

            )



        pdf_payloads.append((pdf_bytes, clean_filename))



    if not pdf_payloads:

        raise HTTPException(

            status_code=status.HTTP_400_BAD_REQUEST,

            detail="None of the uploaded files contained valid PDF data."

        )



    try:

        graph_data = extract_course_graph_from_multiple_pdfs(pdf_payloads)

    except Exception as e:

        raise HTTPException(

            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,

            detail=f"Knowledge graph extraction error: {str(e)}"

        )



    updated_course = course_service.save_generated_graph_to_course(

        db=db,

        course_id=course_id,

        graph_data=graph_data,

        current_user=current_user

    )



    return updated_course





# --- Student & Course Document Access Endpoints ---

@router.get("/{course_id}/documents", response_model=CourseDocumentListResponse)

def list_course_documents(

    course_id: UUID,

    db: Session = Depends(get_db),

    current_user: User = Depends(get_current_user)

):

    """Returns the list of uploaded PDF course documents."""

    course_service.validate_user_course_access(db, course_id, current_user)

    documents = course_service.get_course_documents(db, course_id)



    docs_response = [

        CourseDocumentResponse(

            id=doc.id,

            course_id=doc.course_id,

            file_name=doc.file_name,

            file_path=doc.file_path,

            file_size=doc.file_size,

            mime_type=doc.mime_type,

            uploaded_at=doc.uploaded_at,

            download_url=f"/api/v1/courses/{course_id}/documents/{doc.id}/download"

        )

        for doc in documents

    ]



    return CourseDocumentListResponse(

        course_id=course_id,

        total_count=len(docs_response),

        documents=docs_response

    )





@router.get("/{course_id}/documents/{document_id}/download")

def download_course_document(

    course_id: UUID,

    document_id: UUID,

    db: Session = Depends(get_db),

    current_user: User = Depends(get_current_user)

):

    """Securely streams a course PDF document."""

    course_service.validate_user_course_access(db, course_id, current_user)



    doc = course_service.get_course_document_by_id(db, course_id, document_id)

    if not doc:

        raise HTTPException(

            status_code=status.HTTP_404_NOT_FOUND,

            detail="Document not found."

        )



    file_path = Path(doc.file_path)

    if not file_path.exists():

        raise HTTPException(

            status_code=status.HTTP_404_NOT_FOUND,

            detail="Document file does not exist on server storage."

        )



    return FileResponse(

        path=str(file_path),

        media_type=doc.mime_type or "application/pdf",

        filename=doc.file_name

    )





@router.get("/node/{node_id}/rag-context", response_model=RAGContextResponse)

def get_node_rag_context_endpoint(

    node_id: UUID,

    db: Session = Depends(get_db),

    current_user: User = Depends(get_current_user)

):

    """Retrieves RAG reference chunks and excerpts for a learning node."""

    context_data = course_service.get_node_rag_context(db, node_id, current_user)

    return RAGContextResponse(**context_data)





@router.get("/published", response_model=List[CourseDetailResponse])

def list_published_courses(

    q: Optional[str] = Query(None, description="Search keyword"),

    category: Optional[str] = Query(None, description="Filter category"),

    skip: int = Query(0, ge=0),

    limit: int = Query(20, ge=1, le=100),

    db: Session = Depends(get_db)

):

    """Public Endpoint for Course Browsing & Searching."""

    return course_service.get_published_courses_with_search(

        db=db,

        search=q,

        category_name=category,

        skip=skip,

        limit=limit

    )





@router.get("/details/{course_id}", response_model=CourseDetailResponse)

def get_public_course_details(

    course_id: UUID,

    db: Session = Depends(get_db)

):

    """Public Course Landing Page Endpoint."""

    return course_service.get_single_course_public_details(db, course_id)





@router.get("/{course_id}", response_model=CourseResponse)

def get_course_details(

    course_id: UUID,

    db: Session = Depends(get_db)

):

    """Retrieves full course structure."""

    return course_service.get_course_by_id(db, course_id)





@router.put("/{course_id}/publish", response_model=CourseResponse)

def publish_course_endpoint(

    course_id: UUID,

    db: Session = Depends(get_db),

    current_user: User = Depends(require_roles([UserRole.INSTRUCTOR, UserRole.ADMIN]))

):

    """Publishes a course draft."""

    return course_service.publish_course(db, course_id, current_user)





@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)

def delete_course_endpoint(

    course_id: UUID,

    db: Session = Depends(get_db),

    current_user: User = Depends(require_roles([UserRole.INSTRUCTOR, UserRole.ADMIN]))

):

    """Deletes a course."""

    course_service.delete_course(db, course_id, current_user)





@router.get("/{course_id}/graph", response_model=CourseGraphResponse)

def get_course_graph(

    course_id: UUID,

    db: Session = Depends(get_db),

    current_user: User = Depends(get_current_user)

):

    """Fetches the entire course graph with student-specific status."""

    course = db.query(Course).filter(Course.id == course_id).first()

    if not course:

        raise HTTPException(

            status_code=status.HTTP_404_NOT_FOUND,

            detail="Course not found."

        )



    edges = db.query(Edge).filter(Edge.course_id == course_id).all()



    # Enforce strict sequential dependency and unlock rules

    sorted_nodes, node_evals = evaluate_sequential_student_progress(db, current_user.id, course_id, auto_commit=True)

    node_ids = [n.id for n in sorted_nodes]



    best_scores_query = (

        db.query(

            QuizAttempt.node_id,

            func.max(QuizAttempt.score_percentage).label("max_score")

        )

        .filter(

            QuizAttempt.student_id == current_user.id,

            QuizAttempt.node_id.in_(node_ids)

        )

        .group_by(QuizAttempt.node_id)

        .all()

    )

    score_map: Dict[UUID, float] = {row.node_id: row.max_score for row in best_scores_query}



    formatted_nodes: List[GraphNodeResponse] = []

    

    for n in sorted_nodes:

        eval_info = node_evals.get(n.id, {})

        if eval_info.get("is_completed"):

            status_enum = NodeProgressStatus.COMPLETED

        elif eval_info.get("is_unlocked"):

            status_enum = NodeProgressStatus.UNLOCKED

        else:

            status_enum = NodeProgressStatus.LOCKED



        formatted_nodes.append(

            GraphNodeResponse(

                id=n.id,

                node_key=n.node_key,

                title=n.title,

                summary=n.summary,

                page_references=n.page_references,

                youtube_url=n.youtube_url,

                youtube_timestamp_seconds=n.youtube_timestamp_seconds,

                position_x=n.position_x,

                position_y=n.position_y,

                status=status_enum,

                best_score_percentage=score_map.get(n.id) if eval_info.get("is_unlocked") else None

            )

        )



    formatted_edges = [

        GraphEdgeResponse(

            source_node_key=e.source_node_key,

            target_node_key=e.target_node_key

        )

        for e in edges

    ]



    return CourseGraphResponse(

        course_id=course.id,

        course_title=course.title,

        course_description=course.description,

        nodes=formatted_nodes,

        edges=formatted_edges

    )





@router.get("/instructor/{course_id}/graph")

def get_instructor_course_graph(

    course_id: UUID, 

    db: Session = Depends(get_db),

    current_user: User = Depends(get_current_user)

):

    if current_user.role != UserRole.INSTRUCTOR and current_user.role != UserRole.ADMIN:

        raise HTTPException(status_code=403, detail="Not authorized")



    course = db.query(Course).options(

        joinedload(Course.nodes).joinedload(Node.quizzes),

        joinedload(Course.edges)

    ).filter(Course.id == course_id).first()



    if not course:

        raise HTTPException(

            status_code=status.HTTP_404_NOT_FOUND, 

            detail="Course not found"

        )



    formatted_nodes = []

    for n in course.nodes:

        quizzes_data = [

            {

                "id": str(q.id),

                "set_number": q.set_number,

                "question": q.question_text,

                "options": q.options,

                "correct_option_index": q.correct_option_index,

                "explanation": q.explanation,

                "difficulty": q.difficulty

            }

            for q in n.quizzes

        ]



        formatted_nodes.append({

            "id": str(n.id),

            "node_key": n.node_key,

            "title": n.title,

            "summary": n.summary,

            "page_references": n.page_references,

            "youtube_url": n.youtube_url,

            "youtube_timestamp_seconds": n.youtube_timestamp_seconds,

            "position_x": n.position_x,

            "position_y": n.position_y,

            "quizzes": quizzes_data

        })



    return {

        "course_id": str(course.id),

        "course_title": course.title,

        "course_description": course.description,

        "nodes": formatted_nodes,

        "edges": [

            {

                "id": str(e.id) if hasattr(e, "id") else f"edge-{e.source_node_key}-{e.target_node_key}",

                "source_node_key": e.source_node_key,

                "target_node_key": e.target_node_key,

            }

            for e in course.edges

        ]

    }





@router.get("/instructor/drafts", response_model=List[CourseResponse])

def list_instructor_drafts(

    db: Session = Depends(get_db),

    current_user: User = Depends(require_roles([UserRole.INSTRUCTOR]))

):

    return course_service.get_instructor_draft_courses(db=db, current_user=current_user)





@router.put("/instructor/{course_id}/graph", response_model=Dict[str, Any])

def update_instructor_course_graph_endpoint(

    course_id: UUID,

    payload: Dict[str, Any],

    db: Session = Depends(get_db),

    current_user: User = Depends(require_roles([UserRole.INSTRUCTOR, UserRole.ADMIN]))

):

    updated_course = course_service.update_instructor_course_graph(

        db=db,

        course_id=course_id,

        graph_data=payload,

        current_user=current_user

    )

    return {"message": "Course graph updated successfully", "course_id": str(updated_course.id)}





@router.get("/instructor/{course_id}/analytics", response_model=Dict[str, Any])

def get_instructor_course_analytics(

    course_id: UUID,

    db: Session = Depends(get_db),

    current_user: User = Depends(get_current_user)

):

    """

    Returns heatmap analytics for an instructor including:

    - Total enrolled vs active students (filtering out dropped/inactive students)

    - Node clearance counts & percentages

    - Difficult node detection: flagged RED if >= 40% of active students 

      have more than 6 total quiz attempts (Quiz Set 1 + Set 2) on that node.

    """

    if current_user.role not in [UserRole.INSTRUCTOR, UserRole.ADMIN]:

        raise HTTPException(

            status_code=status.HTTP_403_FORBIDDEN,

            detail="Only instructors or admins can view course analytics."

        )



    course = db.query(Course).filter(Course.id == course_id).first()

    if not course:

        raise HTTPException(

            status_code=status.HTTP_404_NOT_FOUND,

            detail="Course not found."

        )



    # 1. Total Enrolled Students Count

    enrollments = db.query(UserCourseEnrollment).filter(

        UserCourseEnrollment.course_id == course_id

    ).all()

    

    total_enrolled_students = len(enrollments)



    # 2. Active Students Filter (Excluding DROPPED students as per Mam's requirement)

    active_enrollments = [e for e in enrollments if e.status != 'DROPPED']

    active_student_ids = [e.student_id for e in active_enrollments]

    total_active_students = len(active_student_ids)



    # Fetch all nodes for this course

    nodes = db.query(Node).filter(Node.course_id == course_id).all()

    node_analytics = []



    for node in nodes:

        # Clearance count among active students

        cleared_students_count = db.query(func.count(StudentProgress.id)).filter(

            StudentProgress.node_id == node.id,

            StudentProgress.student_id.in_(active_student_ids) if active_student_ids else False,

            StudentProgress.is_completed == True

        ).scalar() or 0



        clearance_percentage = (

            round((cleared_students_count / total_active_students) * 100.0, 2)

            if total_active_students > 0

            else 0.0

        )



        # 3. Difficult Node Check (>= 40% active students with total attempts > 6)

        struggling_students_count = 0

        if active_student_ids:

            # Query students who have > 6 total quiz attempts on this node

            attempt_counts_query = (

                db.query(

                    QuizAttempt.student_id,

                    func.count(QuizAttempt.id).label("total_attempts")

                )

                .filter(

                    QuizAttempt.node_id == node.id,

                    QuizAttempt.student_id.in_(active_student_ids)

                )

                .group_by(QuizAttempt.student_id)

                .all()

            )

            

            # Count students with > 6 attempts

            struggling_students_count = sum(1 for row in attempt_counts_query if row.total_attempts > 6)



        struggling_percentage = (

            round((struggling_students_count / total_active_students) * 100.0, 2)

            if total_active_students > 0

            else 0.0

        )



        # Flag as RED if >= 40% active students are struggling, else GREEN based on clearance

        is_difficult = struggling_percentage >= 40.0

        heatmap_status = "RED" if is_difficult or clearance_percentage < 60.0 else "GREEN"



        node_analytics.append({

            "node_id": str(node.id),

            "node_key": node.node_key,

            "title": node.title,

            "total_enrolled": total_enrolled_students,

            "total_active": total_active_students,

            "cleared_students_count": cleared_students_count,

            "clearance_percentage": clearance_percentage,

            "struggling_students_count": struggling_students_count,

            "struggling_percentage": struggling_percentage,

            "is_difficult_node": is_difficult,

            "heatmap_status": heatmap_status

        })



    return {

        "course_id": str(course.id),

        "course_title": course.title,

        "total_enrolled_students": total_enrolled_students,

        "total_active_students": total_active_students,

        "nodes_analytics": node_analytics

    }



# --- Instructor Reports & Analytics Endpoints ---



@router.get("/instructor/reports/overview")

def get_instructor_reports_overview(

    db: Session = Depends(get_db),

    current_user: User = Depends(require_roles([UserRole.INSTRUCTOR, UserRole.ADMIN]))

):

    """

    Returns overview metrics for an instructor:

    - Instructor Popular Course: course with highest student enrollments

    - Instructor Most Completed Course: course with highest number of 100% completed students

    - Individual course summaries

    """

    instructor_courses = db.query(Course).filter(Course.instructor_id == current_user.id).all()



    courses_summary = []

    popular_course = None

    most_completed_course = None

    max_enrollments = -1

    max_completions = -1



    for c in instructor_courses:

        total_enrolled = (

            db.query(func.count(UserCourseEnrollment.id))

            .filter(UserCourseEnrollment.course_id == c.id)

            .scalar() or 0

        )

        completed_count = (

            db.query(func.count(UserCourseEnrollment.id))

            .filter(

                UserCourseEnrollment.course_id == c.id,

                (UserCourseEnrollment.status == "COMPLETED") | (UserCourseEnrollment.progress_percentage >= 100.0)

            )

            .scalar() or 0

        )

        completion_rate = round((completed_count / total_enrolled) * 100.0, 1) if total_enrolled > 0 else 0.0



        summary_item = {

            "id": str(c.id),

            "title": c.title,

            "status": c.status.value if hasattr(c.status, "value") else str(c.status),

            "total_enrollments": total_enrolled,

            "completed_students": completed_count,

            "completion_rate": completion_rate,

            "total_nodes": len(c.nodes) if c.nodes else 0

        }

        courses_summary.append(summary_item)



        if total_enrolled > max_enrollments and total_enrolled > 0:

            max_enrollments = total_enrolled

            popular_course = {

                "id": str(c.id),

                "title": c.title,

                "total_enrollments": total_enrolled

            }



        if completed_count > max_completions and completed_count > 0:

            max_completions = completed_count

            most_completed_course = {

                "id": str(c.id),

                "title": c.title,

                "completed_students_count": completed_count,

                "total_enrollments": total_enrolled,

                "completion_rate": completion_rate

            }



    return {

        "popular_course": popular_course,

        "most_completed_course": most_completed_course,

        "courses_summary": courses_summary

    }





@router.get("/instructor/{course_id}/quiz-report")

def get_instructor_course_quiz_report(

    course_id: UUID,

    node_id: Optional[UUID] = None,

    db: Session = Depends(get_db),

    current_user: User = Depends(require_roles([UserRole.INSTRUCTOR, UserRole.ADMIN]))

):

    """

    Granular quiz performance report:

    - Counts and lists students scoring < 70

    - Counts and lists students scoring >= 70

    - Tracks and lists non-attempted students enrolled in the course

    """

    course = db.query(Course).filter(Course.id == course_id).first()

    if not course:

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")



    if current_user.role == UserRole.INSTRUCTOR and course.instructor_id != current_user.id:

        raise HTTPException(

            status_code=status.HTTP_403_FORBIDDEN, 

            detail="You do not have access to view this course's quiz report."

        )



    # Fetch all active enrolled students

    enrollments = (

        db.query(UserCourseEnrollment)

        .options(joinedload(UserCourseEnrollment.student))

        .filter(

            UserCourseEnrollment.course_id == course_id,

            UserCourseEnrollment.status != "DROPPED"

        )

        .all()

    )



    # Target nodes

    node_name = "All Course Concepts"

    if node_id:

        target_node = db.query(Node).filter(Node.id == node_id, Node.course_id == course_id).first()

        if not target_node:

            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Node not found.")

        node_name = target_node.title

        target_node_ids = [node_id]

    else:

        target_node_ids = [n.id for n in course.nodes] if course.nodes else []



    students_below_70 = []

    students_above_70 = []

    students_non_attempted = []



    for e in enrollments:

        student = e.student

        if not student:

            continue



        attempts = []

        if target_node_ids:

            attempts = (

                db.query(QuizAttempt)

                .filter(

                    QuizAttempt.student_id == student.id,

                    QuizAttempt.node_id.in_(target_node_ids)

                )

                .order_by(QuizAttempt.attempted_at.desc())

                .all()

            )



        if not attempts:

            students_non_attempted.append({

                "student_id": str(student.id),

                "student_name": student.full_name,

                "student_email": student.email,

                "enrolled_at": e.enrolled_at.isoformat() if e.enrolled_at else None

            })

        else:

            scores = [a.score if a.score is not None else a.score_percentage for a in attempts]

            best_score = max(scores)

            latest_score = scores[0]



            student_entry = {

                "student_id": str(student.id),

                "student_name": student.full_name,

                "student_email": student.email,

                "best_score": round(best_score, 1),

                "latest_score": round(latest_score, 1),

                "attempts_count": len(attempts),

                "latest_attempt_at": attempts[0].attempted_at.isoformat() if attempts[0].attempted_at else None

            }



            if best_score < 70.0:

                students_below_70.append(student_entry)

            else:

                students_above_70.append(student_entry)



    return {

        "course_id": str(course.id),

        "course_title": course.title,

        "node_id": str(node_id) if node_id else None,

        "node_title": node_name,

        "summary": {

            "total_enrolled": len(enrollments),

            "total_attempted": len(students_below_70) + len(students_above_70),

            "total_non_attempted": len(students_non_attempted),

            "scored_below_70_count": len(students_below_70),

            "scored_above_70_count": len(students_above_70)

        },

        "students_below_70": students_below_70,

        "students_above_70": students_above_70,

        "students_non_attempted": students_non_attempted

    }





# --- Student AI Doubt Solver Endpoint ---



class StudentDoubtRequest(BaseModel):

    question: str

    chat_history: Optional[List[Dict[str, str]]] = []





@router.post("/{course_id}/nodes/{node_id}/doubt")

def ask_node_doubt_endpoint(

    course_id: UUID,

    node_id: UUID,

    payload: StudentDoubtRequest,

    db: Session = Depends(get_db),

    current_user: User = Depends(get_current_user)

):

    """

    AI Doubt Solver endpoint for a specific learning node using Gemini and RAG context chunks.

    """

    course = db.query(Course).filter(Course.id == course_id).first()

    if not course:

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")



    node = db.query(Node).filter(Node.id == node_id, Node.course_id == course_id).first()

    if not node:

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Learning node not found.")



    # Validate student enrollment or access

    course_service.validate_user_course_access(db, course_id, current_user)



    # Fetch relevant chunks

    chunks = []

    if node.page_references:

        target_pages = []

        if isinstance(node.page_references, list):

            target_pages = [int(p) for p in node.page_references if str(p).isdigit()]

        elif isinstance(node.page_references, int):

            target_pages = [node.page_references]

        elif isinstance(node.page_references, str):

            nums = re.findall(r"\d+", node.page_references)

            target_pages = [int(n) for n in nums]



        if target_pages:

            chunks = (

                db.query(DocumentChunk)

                .options(joinedload(DocumentChunk.document))

                .filter(

                    DocumentChunk.course_id == course_id,

                    DocumentChunk.page_number.in_(target_pages)

                )

                .limit(4)

                .all()

            )



    if not chunks:

        chunks = (

            db.query(DocumentChunk)

            .options(joinedload(DocumentChunk.document))

            .filter(DocumentChunk.course_id == course_id)

            .limit(3)

            .all()

        )



    chunk_texts = [c.content for c in chunks if c.content]



    # Generate answer via Gemini

    answer = answer_student_doubt(

        course_title=course.title,

        node_title=node.title,

        node_summary=node.summary,

        question=payload.question,

        context_chunks=chunk_texts,

        chat_history=payload.chat_history

    )



    references = [

        {

            "document_name": c.document.file_name if c.document else "Course Document",

            "page": c.page_number,

            "excerpt": c.content[:250] + "..." if c.content and len(c.content) > 250 else (c.content or "")

        }

        for c in chunks

    ]



    return {

        "answer": answer,

        "node_id": str(node.id),

        "node_title": node.title,

        "references": references

    }

