import re
from datetime import datetime, timezone
from typing import List, Optional, Tuple, Dict, Any
from uuid import UUID, uuid4
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.course import UserCourseEnrollment, EnrollmentStatus, Course, Node, Edge, Badge
from app.models.quiz import StudentProgress, StudentQuizSetProgress
from app.models.user import User


def sort_course_nodes(nodes: List[Node], edges: Optional[List[Edge]] = None) -> List[Node]:
    """
    Sorts course nodes strictly into sequential learning order (1 to N).
    Prioritizes:
    1. Topological order derived from prerequisite edges (if acyclic).
    2. Numerical index extracted from node_key or title (e.g., 'node_1' -> 1).
    3. Layout position (position_y, position_x).
    """
    if not nodes or len(nodes) <= 1:
        return list(nodes)

    def extract_index(n: Node) -> Optional[int]:
        for text in [n.node_key, n.title]:
            if text:
                m = re.search(r'\d+', text)
                if m:
                    return int(m.group())
        return None

    # Try topological sort if edges are provided
    if edges:
        key_to_node = {n.node_key: n for n in nodes}
        in_degree = {n.node_key: 0 for n in nodes}
        adj: Dict[str, List[str]] = {n.node_key: [] for n in nodes}

        for e in edges:
            if e.source_node_key in adj and e.target_node_key in in_degree:
                adj[e.source_node_key].append(e.target_node_key)
                in_degree[e.target_node_key] += 1

        queue = [k for k, deg in in_degree.items() if deg == 0]
        queue.sort(key=lambda k: (extract_index(key_to_node[k]) or 999999, key_to_node[k].position_y or 0.0))

        ordered_keys = []
        while queue:
            curr_key = queue.pop(0)
            ordered_keys.append(curr_key)
            for nxt in adj.get(curr_key, []):
                in_degree[nxt] -= 1
                if in_degree[nxt] == 0:
                    queue.append(nxt)
            queue.sort(key=lambda k: (extract_index(key_to_node[k]) or 999999, key_to_node[k].position_y or 0.0))

        if len(ordered_keys) == len(nodes):
            return [key_to_node[k] for k in ordered_keys]

    # Fallback sorting: numeric index from key/title, then position_y, then title
    return sorted(
        nodes,
        key=lambda n: (
            extract_index(n) if extract_index(n) is not None else 999999,
            n.position_y if n.position_y is not None else 0.0,
            n.position_x if n.position_x is not None else 0.0,
            n.node_key or ""
        )
    )


def evaluate_sequential_student_progress(
    db: Session,
    student_id: UUID,
    course_id: UUID,
    auto_commit: bool = True
) -> Tuple[List[Node], Dict[UUID, Dict[str, Any]]]:
    """
    Evaluates and enforces strict sequential module progression for a student:
    - Nodes are ordered strictly 0 to M-1.
    - Node 0 is always unlocked.
    - Node N is unlocked if and only if ALL preceding nodes (0 to N-1) are completed (100% or both quiz sets passed).
    - If any node i is incomplete, ALL subsequent nodes (i+1 to M-1) are strictly LOCKED:
      their is_unlocked and is_completed flags are forced to False, and progress is 0.0.
    - Database records (StudentProgress) are updated and synchronized.
    Returns (sorted_nodes, node_status_dict).
    """
    nodes = db.query(Node).filter(Node.course_id == course_id).all()
    edges = db.query(Edge).filter(Edge.course_id == course_id).all()
    sorted_nodes = sort_course_nodes(nodes, edges)

    if not sorted_nodes:
        return [], {}

    existing_progress = (
        db.query(StudentProgress)
        .filter(
            StudentProgress.student_id == student_id,
            StudentProgress.node_id.in_([n.id for n in sorted_nodes])
        )
        .all()
    )
    prog_map = {p.node_id: p for p in existing_progress}

    all_preceding_completed = True
    node_evaluations: Dict[UUID, Dict[str, Any]] = {}

    for idx, node in enumerate(sorted_nodes):
        passed_sets_count = (
            db.query(StudentQuizSetProgress)
            .filter(
                StudentQuizSetProgress.student_id == student_id,
                StudentQuizSetProgress.node_id == node.id,
                StudentQuizSetProgress.is_passed == True
            )
            .count()
        )

        p = prog_map.get(node.id)

        if all_preceding_completed:
            # First node or all preceding nodes were completed
            is_unlocked = True
            is_completed = (passed_sets_count >= 2) or (p.is_completed if (p and passed_sets_count >= 1) else False)

            if is_completed:
                mod_pct = 100.0
            else:
                mod_pct = 50.0 if passed_sets_count == 1 else 0.0
                # Halt sequential unlock for all subsequent nodes!
                all_preceding_completed = False
        else:
            # Preceding node incomplete -> Force strict LOCKED state!
            is_unlocked = False
            is_completed = False
            mod_pct = 0.0

        if not p:
            p = StudentProgress(
                student_id=student_id,
                node_id=node.id,
                is_unlocked=is_unlocked,
                is_completed=is_completed,
                progress_percentage=mod_pct,
                unlocked_at=datetime.now(timezone.utc) if is_unlocked else None,
                completed_at=datetime.now(timezone.utc) if is_completed else None
            )
            db.add(p)
            prog_map[node.id] = p
        else:
            p.is_unlocked = is_unlocked
            p.is_completed = is_completed
            p.progress_percentage = mod_pct
            if is_unlocked and not p.unlocked_at:
                p.unlocked_at = datetime.now(timezone.utc)
            elif not is_unlocked:
                p.unlocked_at = None

            if is_completed and not p.completed_at:
                p.completed_at = datetime.now(timezone.utc)
            elif not is_completed:
                p.completed_at = None

        node_evaluations[node.id] = {
            "id": p.id,
            "node_id": node.id,
            "node_key": node.node_key,
            "title": node.title,
            "is_unlocked": is_unlocked,
            "is_completed": is_completed,
            "progress_percentage": mod_pct,
            "passed_sets_count": passed_sets_count if is_unlocked else 0,
            "unlocked_at": p.unlocked_at,
            "completed_at": p.completed_at
        }

    if auto_commit:
        db.commit()

    return sorted_nodes, node_evaluations


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
    db.flush()

    # 4. Initialize StudentProgress for all nodes in this course in strict sequential order
    nodes = db.query(Node).filter(Node.course_id == course_id).all()
    edges = db.query(Edge).filter(Edge.course_id == course_id).all()
    sorted_nodes = sort_course_nodes(nodes, edges)

    progress_entries = []
    for idx, node in enumerate(sorted_nodes):
        is_first = (idx == 0)
        p = StudentProgress(
            student_id=student_id,
            node_id=node.id,
            is_unlocked=is_first,  # Unlock strictly ONLY the 1st module upon enrollment!
            is_completed=False,
            progress_percentage=0.0,
            unlocked_at=datetime.now(timezone.utc) if is_first else None
        )
        progress_entries.append(p)

    db.add_all(progress_entries)
    db.commit()
    db.refresh(enrollment)
    return enrollment


def update_course_progress_and_badge(db: Session, student_id: UUID, course_id: UUID) -> UserCourseEnrollment:
    """
    Calculates overall course progress % dynamically based on strict sequential module-wise quiz set completions
    (e.g., Set 1 passed = 50%, Set 2 passed = 100%), and automatically issues a completion badge
    and certificate eligibility when 100% is reached.
    """
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

    sorted_nodes, node_evals = evaluate_sequential_student_progress(db, student_id, course_id, auto_commit=False)
    total_nodes = len(sorted_nodes)
    if total_nodes == 0:
        return enrollment

    total_module_progress = sum(ne["progress_percentage"] for ne in node_evals.values())
    all_nodes_completed = all(ne["is_completed"] for ne in node_evals.values())

    progress_pct = round(total_module_progress / total_nodes, 2)
    enrollment.progress_percentage = progress_pct

    # 100% Completion Check: Auto-issue Badge and mark course Completed
    if progress_pct >= 100.0 or all_nodes_completed:
        enrollment.progress_percentage = 100.0
        if enrollment.status != EnrollmentStatus.COMPLETED:
            enrollment.status = EnrollmentStatus.COMPLETED
            if not enrollment.completed_at:
                enrollment.completed_at = datetime.now(timezone.utc)

        # Auto-issue Badge if not already created
        existing_badge = db.query(Badge).filter(Badge.enrollment_id == enrollment.id).first()
        if not existing_badge:
            course = db.query(Course).filter(Course.id == course_id).first()
            badge_title = f"Master of {course.title}" if course else "Course Completion Badge"
            badge = Badge(
                id=uuid4(),
                enrollment_id=enrollment.id,
                badge_title=badge_title,
                badge_image_url="/default-badge.png",
                issued_at=datetime.now(timezone.utc)
            )
            db.add(badge)

    db.commit()
    db.refresh(enrollment)
    return enrollment
