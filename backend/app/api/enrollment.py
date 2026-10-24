from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.user import User, UserRole
from app.models.course import Course, Node, Edge, Badge, EnrollmentStatus, CourseStatus, UserCourseEnrollment
from app.models.quiz import StudentProgress
from app.schemas.enrollment import (
    EnrollmentCreate,
    EnrollmentStatusUpdate,
    UserCourseEnrollmentResponse,
    BadgeResponse,
)
from app.core.security import get_current_user, require_roles
from app.services.certificate_service import generate_course_certificate
from app.services.enrollment_service import update_course_progress_and_badge

router = APIRouter(prefix="/enrollments", tags=["Enrollments & Badges"])


def update_and_calculate_course_progress(db: Session, enrollment: UserCourseEnrollment) -> float:
    """
    Calculates overall course completion percentage and handles badge issuance if 100% completed.
    Delegates to the canonical enrollment_service engine.
    """
    updated = update_course_progress_and_badge(db, enrollment.student_id, enrollment.course_id)
    return updated.progress_percentage


@router.post("/", response_model=UserCourseEnrollmentResponse, status_code=status.HTTP_201_CREATED)
def enroll_in_course(
    enrollment_data: EnrollmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.STUDENT]))
):
    """
    Enrolls the logged-in student into a published course.
    Automatically unlocks all root nodes (nodes with 0 incoming prerequisite edges).
    """
    course = db.query(Course).filter(Course.id == enrollment_data.course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found."
        )

    if course.status != CourseStatus.PUBLISHED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot enroll in an unpublished draft course."
        )

    # Check for existing enrollment
    existing = db.query(UserCourseEnrollment).filter(
        UserCourseEnrollment.student_id == current_user.id,
        UserCourseEnrollment.course_id == course.id
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already enrolled in this course."
        )

    # 1. Create Enrollment
    enrollment = UserCourseEnrollment(
        student_id=current_user.id,
        course_id=course.id,
        status=EnrollmentStatus.IN_PROGRESS,
        progress_percentage=0.0,
        enrolled_at=datetime.now(timezone.utc)
    )
    db.add(enrollment)
    db.flush()

    # 2. Unlock Root Nodes (Nodes that have no incoming edges)
    all_nodes = db.query(Node).filter(Node.course_id == course.id).all()
    target_node_keys = set(
        edge.target_node_key for edge in db.query(Edge.target_node_key).filter(Edge.course_id == course.id).all()
    )

    for node in all_nodes:
        is_root = node.node_key not in target_node_keys
        progress = StudentProgress(
            student_id=current_user.id,
            node_id=node.id,
            is_unlocked=is_root,  # True if root node, False otherwise
            is_completed=False,
            unlocked_at=datetime.now(timezone.utc) if is_root else None
        )
        db.add(progress)

    db.commit()
    db.refresh(enrollment)
    return enrollment


@router.get("/me", response_model=List[UserCourseEnrollmentResponse])
def get_my_enrollments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns all courses the current user is enrolled in, updated with real-time completion progress.
    """
    enrollments = (
        db.query(UserCourseEnrollment)
        .options(
            joinedload(UserCourseEnrollment.course),
            joinedload(UserCourseEnrollment.badge)
        )
        .filter(UserCourseEnrollment.student_id == current_user.id)
        .all()
    )

    for enrollment in enrollments:
        update_and_calculate_course_progress(db, enrollment)

    return enrollments


@router.get("/{course_id}", response_model=UserCourseEnrollmentResponse)
def get_enrollment_by_course(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Fetches enrollment details and progress status for a specific course.
    """
    enrollment = (
        db.query(UserCourseEnrollment)
        .options(
            joinedload(UserCourseEnrollment.course),
            joinedload(UserCourseEnrollment.badge)
        )
        .filter(
            UserCourseEnrollment.student_id == current_user.id,
            UserCourseEnrollment.course_id == course_id
        )
        .first()
    )

    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Enrollment not found for this course."
        )

    update_and_calculate_course_progress(db, enrollment)
    return enrollment


@router.patch("/{enrollment_id}/status", response_model=UserCourseEnrollmentResponse)
def update_enrollment_status(
    enrollment_id: int,
    status_data: EnrollmentStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.INSTRUCTOR, UserRole.ADMIN]))
):
    """
    Updates enrollment status (e.g., DROPPED, COMPLETED). Restricted to Instructors and Admins.
    """
    enrollment = db.query(UserCourseEnrollment).filter(UserCourseEnrollment.id == enrollment_id).first()
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Enrollment record not found."
        )

    enrollment.status = status_data.status
    if status_data.status == EnrollmentStatus.COMPLETED and not enrollment.completed_at:
        enrollment.completed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(enrollment)
    return enrollment


@router.get("/badges/me", response_model=List[BadgeResponse])
def get_my_earned_badges(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.STUDENT]))
):
    """
    Retrieves all course completion badges earned by the authenticated student.
    Populates course_id, course_title, and certificate download URL.
    """
    badges = (
        db.query(Badge)
        .join(UserCourseEnrollment, Badge.enrollment_id == UserCourseEnrollment.id)
        .options(
            joinedload(Badge.enrollment).joinedload(UserCourseEnrollment.course)
        )
        .filter(UserCourseEnrollment.student_id == current_user.id)
        .order_by(Badge.issued_at.desc())
        .all()
    )

    response_badges: List[BadgeResponse] = []
    for badge in badges:
        course_id = badge.enrollment.course_id if badge.enrollment else None
        course_title = badge.enrollment.course.title if (badge.enrollment and badge.enrollment.course) else None
        cert_url = f"/enrollments/{course_id}/certificate/download" if course_id else None

        response_badges.append(
            BadgeResponse(
                id=badge.id,
                enrollment_id=badge.enrollment_id,
                course_id=course_id,
                course_title=course_title,
                badge_title=badge.badge_title,
                badge_image_url=badge.badge_image_url or "/default-badge.png",
                certificate_url=cert_url,
                issued_at=badge.issued_at
            )
        )

    return response_badges


@router.get("/{course_id}/certificate/download")
def download_course_certificate(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.STUDENT]))
):
    """
    Validates 100% course completion and streams an official, verified 
    certificate PNG image containing the student's name and course title.
    """
    # 1. Update and verify real-time completion state
    enrollment = update_course_progress_and_badge(db, current_user.id, course_id)

    if not enrollment or enrollment.status != EnrollmentStatus.COMPLETED or enrollment.progress_percentage < 100.0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Certificate is only available for fully completed courses (100% progress required)."
        )

    # 2. Fetch full relations for names and certificate ID
    enrollment_with_relations = (
        db.query(UserCourseEnrollment)
        .options(
            joinedload(UserCourseEnrollment.student),
            joinedload(UserCourseEnrollment.course),
            joinedload(UserCourseEnrollment.badge)
        )
        .filter(
            UserCourseEnrollment.student_id == current_user.id,
            UserCourseEnrollment.course_id == course_id
        )
        .first()
    )

    student_name = (
        enrollment_with_relations.student.full_name
        if enrollment_with_relations and enrollment_with_relations.student and enrollment_with_relations.student.full_name
        else current_user.full_name
    ) or "Valued Scholar"

    course_title = (
        enrollment_with_relations.course.title
        if enrollment_with_relations and enrollment_with_relations.course and enrollment_with_relations.course.title
        else "EduGraph Verified Course"
    )

    badge_id_str = str(enrollment_with_relations.badge.id) if (enrollment_with_relations and enrollment_with_relations.badge) else None
    cert_id = f"EDG-CERT-{badge_id_str[:8].upper()}" if badge_id_str else None

    # 3. Generate certificate image stream
    cert_buffer = generate_course_certificate(
        student_name=student_name,
        course_title=course_title,
        completion_date=enrollment.completed_at or datetime.now(timezone.utc),
        certificate_id=cert_id,
        output_format="png"
    )

    # Format download filename
    safe_title = "".join(c for c in course_title if c.isalnum() or c in (' ', '_', '-')).strip().replace(' ', '_')
    filename = f"EduGraph_Certificate_{safe_title}.png"

    return StreamingResponse(
        cert_buffer,
        media_type="image/png",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )
