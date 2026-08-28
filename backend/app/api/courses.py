# app/api/v1/endpoints/courses.py
from typing import Dict, List, Set
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.course import CourseCreate, CourseResponse, CategoryCreate, CategoryResponse
from app.services import course_service
from app.services.gemini_service import extract_course_graph_from_pdf
from app.core.security import get_current_user, require_roles
from app.schemas.node_graph import CourseGraphResponse,GraphNodeResponse,GraphEdgeResponse,NodeProgressStatus
from app.models.quiz import QuizAttempt, StudentProgress
from app.models.course import Category, Course, CourseStatus, Edge, Node

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
    """Returns dynamic counts for the Admin Dashboard."""
    total_users = db.query(User).filter(User.is_active == True).count()
    total_categories = db.query(Category).count() if 'Category' in globals() else 0
    total_courses = db.query(Course).filter(Course.status == CourseStatus.PUBLISHED).count()
    
    return {
        "total_users": total_users,
        "total_categories": total_categories,
        "total_courses": total_courses,
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
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.INSTRUCTOR, UserRole.ADMIN]))
):
    """
    Uploads PDF and extracts graph nodes, edges, & quizzes into PostgreSQL (Instructors & Admins only).
    """
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported."
        )

    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty."
        )

    graph_data = extract_course_graph_from_pdf(pdf_bytes, mime_type=file.content_type)

    updated_course = course_service.save_generated_graph_to_course(
        db=db,
        course_id=course_id,
        graph_data=graph_data,
        current_user=current_user
    )

    return updated_course


@router.get("/published", response_model=List[CourseResponse])
def list_published_courses(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """Retrieves published courses for student discovery (Public)."""
    return course_service.get_published_courses(db, skip=skip, limit=limit)


@router.get("/{course_id}", response_model=CourseResponse)
def get_course_details(
    course_id: UUID,
    db: Session = Depends(get_db)
):
    """Retrieves full course structure including Graph Nodes and Edges (Public)."""
    return course_service.get_course_by_id(db, course_id)


@router.put("/{course_id}/publish", response_model=CourseResponse)
def publish_course_endpoint(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.INSTRUCTOR))
):
    """Publishes a course draft (Owner Instructor only)."""
    return course_service.publish_course(db, course_id, current_user)


@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course_endpoint(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.INSTRUCTOR, UserRole.ADMIN]))
):
    """Deletes a course (Owner Instructor or Admin only)."""
    course_service.delete_course(db, course_id, current_user)


@router.get("/{course_id}/graph", response_model=CourseGraphResponse)
def get_course_graph(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Fetches the entire course graph (Nodes + Edges) with student-specific status:
    - COMPLETED: Passed quiz (>= 70%)
    - UNLOCKED: Root node OR all prerequisite parent nodes are completed by this student
    - LOCKED: Missing completion on one or more prerequisite parent nodes
    """
    # 1. Fetch Course
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found."
        )

    # 2. Fetch Nodes & Edges
    nodes = db.query(Node).filter(Node.course_id == course_id).all()
    edges = db.query(Edge).filter(Edge.course_id == course_id).all()

    node_ids = [n.id for n in nodes]

    # 3. Fetch current student's progress records for this course
    progress_records = db.query(StudentProgress).filter(
        StudentProgress.student_id == current_user.id,
        StudentProgress.node_id.in_(node_ids)
    ).all()
    
    # Quick lookup map: node_id -> StudentProgress record
    progress_map: Dict[UUID, StudentProgress] = {p.node_id: p for p in progress_records}

    # 4. Fetch highest quiz attempt score per node for current student
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

    # 5. Build lookup maps for Prerequisites
    # target_node_key -> list of source_node_keys
    prereqs_map: Dict[str, List[str]] = {n.node_key: [] for n in nodes}
    for e in edges:
        if e.target_node_key in prereqs_map:
            prereqs_map[e.target_node_key].append(e.source_node_key)

    # Set of completed node_keys by this student
    completed_node_keys: Set[str] = {
        n.node_key for n in nodes
        if progress_map.get(n.id) and progress_map[n.id].is_completed
    }

    # 6. Build response node list with evaluated statuses
    formatted_nodes: List[GraphNodeResponse] = []
    
    for n in nodes:
        prog = progress_map.get(n.id)
        prereqs = prereqs_map.get(n.node_key, [])
        
        # Check if all upstream prerequisites are completed
        all_prereqs_completed = all(p_key in completed_node_keys for p_key in prereqs)

        if prog and prog.is_completed:
            status_enum = NodeProgressStatus.COMPLETED
        elif (prog and prog.is_unlocked) or len(prereqs) == 0 or all_prereqs_completed:
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
                best_score_percentage=score_map.get(n.id)
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
    # Optional: Verify user role and course ownership
    if current_user.role != UserRole.INSTRUCTOR:
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
                "question": q.question_text,
                "options": q.options,
                "correct_answer": getattr(q, "correct_answer", None),
                "explanation": getattr(q, "explanation", None)
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
                # "id": e.id,
                "id": str(e.id) if hasattr(e, "id") else f"edge-{e.source_node_key}-{e.target_node_key}",
                "source_node_key": e.source_node_key,
                "target_node_key": e.target_node_key,
            }
            for e in course.edges
        ]
    }