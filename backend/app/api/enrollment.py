from datetime import datetime, timezone
from typing import List
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, HTTPException, status
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

router = APIRouter(prefix="/enrollments", tags=["Enrollments & Badges"])


def update_and_calculate_course_progress(db: Session, enrollment: UserCourseEnrollment) -> float:
    """
    Calculates overall course completion percentage and handles badge issuance if 100% completed.
    """
    total_nodes = db.query(Node).filter(Node.course_id == enrollment.course_id).count()
    if total_nodes == 0:
        return 0.0

    node_ids = [n.id for n in db.query(Node.id).filter(Node.course_id == enrollment.course_id).all()]

    completed_nodes_count = db.query(StudentProgress).filter(
        StudentProgress.student_id == enrollment.student_id,
        StudentProgress.node_id.in_(node_ids),
        StudentProgress.is_completed == True
    ).count()

    progress_pct = round((completed_nodes_count / total_nodes) * 100.0, 2)
    enrollment.progress_percentage = progress_pct

    # Auto-complete enrollment and issue badge when 100% complete
    if progress_pct >= 100.0 and enrollment.status != EnrollmentStatus.COMPLETED:
        enrollment.status = EnrollmentStatus.COMPLETED
        enrollment.completed_at = datetime.now(timezone.utc)

        # Issue Badge if not already created
        existing_badge = db.query(Badge).filter(Badge.enrollment_id == enrollment.id).first()
        if not existing_badge:
            course = db.query(Course).filter(Course.id == enrollment.course_id).first()
            badge_title = f"Master of {course.title}" if course else "Course Completion Badge"
            
            new_badge = Badge(
                id=uuid4(),
                enrollment_id=enrollment.id,
                badge_title=badge_title,
                issued_at=datetime.now(timezone.utc)
            )
            db.add(new_badge)

    db.commit()
    db.refresh(enrollment)
    return progress_pct


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
    # enrollments = db.query(UserCourseEnrollment).filter(
    #     UserCourseEnrollment.student_id == current_user.id
    # ).all()
    enrollments = db.query(UserCourseEnrollment)\
        .options(joinedload(UserCourseEnrollment.course))\
        .filter(UserCourseEnrollment.student_id == current_user.id)\
        .all()

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
    enrollment = db.query(UserCourseEnrollment).filter(
        UserCourseEnrollment.student_id == current_user.id,
        UserCourseEnrollment.course_id == course_id
    ).first()

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