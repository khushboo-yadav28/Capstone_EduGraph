from datetime import datetime, timezone
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.course import UserCourseEnrollment, EnrollmentStatus, Course, Node, Edge, Badge
from app.models.quiz import StudentProgress
from app.models.user import User


def enroll_student(db: Session, student_id: UUID, course_id: UUID) -> UserCourseEnrollment:
    # 1. Check if course exists and is published
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")

    # 2. Check duplicate enrollment
    existing = (
        db.query(UserCourseEnrollment)
        .filter(
            UserCourseEnrollment.student_id == student_id,
            UserCourseEnrollment.course_id == course_id
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Student is already enrolled in this course."
        )

    # 3. Create enrollment
    enrollment = UserCourseEnrollment(
        student_id=student_id,
        course_id=course_id,
        status=EnrollmentStatus.IN_PROGRESS,
        progress_percentage=0.0
    )
    db.add(enrollment)
    db.flush()  # Flushes to get enrollment.id for badge mapping if needed later

    # 4. Initialize StudentProgress for all nodes in this course
    nodes = db.query(Node).filter(Node.course_id == course_id).all()
    edges = db.query(Edge).filter(Edge.course_id == course_id).all()
    
    # Root nodes have no incoming edges (in-degree == 0)
    target_keys = {e.target_node_key for e in edges}
    
    progress_entries = []
    for node in nodes:
        is_root = node.node_key not in target_keys
        p = StudentProgress(
            student_id=student_id,
            node_id=node.id,
            is_unlocked=is_root,  # Unlock root nodes immediately upon enrollment!
            is_completed=False,
            unlocked_at=datetime.now(timezone.utc) if is_root else None
        )
        progress_entries.append(p)

    db.add_all(progress_entries)
    db.commit()
    db.refresh(enrollment)
    return enrollment


def update_course_progress_and_badge(db: Session, student_id: UUID, course_id: UUID) -> UserCourseEnrollment:
    """Calculates overall progress % and issues a completion badge when 100% is reached."""
    enrollment = (
        db.query(UserCourseEnrollment)
        .filter(
            UserCourseEnrollment.student_id == student_id,
            UserCourseEnrollment.course_id == course_id
        )
        .first()
    )
    if not enrollment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enrollment record not found.")

    nodes = db.query(Node).filter(Node.course_id == course_id).all()
    if not nodes:
        return enrollment

    total_nodes = len(nodes)
    node_ids = [n.id for n in nodes]

    completed_count = (
        db.query(StudentProgress)
        .filter(
            StudentProgress.student_id == student_id,
            StudentProgress.node_id.in_(node_ids),
            StudentProgress.is_completed == True
        )
        .count()
    )

    progress_pct = (completed_count / total_nodes) * 100.0
    enrollment.progress_percentage = round(progress_pct, 2)

    # 100% Completion Check
    if progress_pct >= 100.0 and enrollment.status != EnrollmentStatus.COMPLETED:
        enrollment.status = EnrollmentStatus.COMPLETED
        enrollment.completed_at = datetime.now(timezone.utc)

        # Auto-issue Badge
        course = db.query(Course).filter(Course.id == course_id).first()
        badge = Badge(
            enrollment_id=enrollment.id,
            badge_title=f"Master of {course.title}",
            badge_image_url=f"https://cdn.edugraph.com/badges/{course.id}.png"
        )
        db.add(badge)

    db.commit()
    db.refresh(enrollment)
    return enrollment