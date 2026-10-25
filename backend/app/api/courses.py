# app/api/courses.py
from datetime import datetime
from pathlib import Path
import re
from typing import Any, Dict, List, Optional, Set
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.database import get_db
from app.models.user import User, UserRole
from app.models.course import Category, Course, CourseStatus, Edge, Node, UserCourseEnrollment, CourseDocument, DocumentChunk
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
from app.services.gemini_service import (
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
    """Returns dynamic counts for the Admin Dashboard."""
    total_users = db.query(User).filter(User.is_active == True).count()
    total_categories = db.query(Category).count()
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

    nodes = db.query(Node).filter(Node.course_id == course_id).all()
    edges = db.query(Edge).filter(Edge.course_id == course_id).all()

    node_ids = [n.id for n in nodes]

    progress_records = db.query(StudentProgress).filter(
        StudentProgress.student_id == current_user.id,
        StudentProgress.node_id.in_(node_ids)
    ).all()
    
    progress_map: Dict[UUID, StudentProgress] = {p.node_id: p for p in progress_records}

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

    prereqs_map: Dict[str, List[str]] = {n.node_key: [] for n in nodes}
    for e in edges:
        if e.target_node_key in prereqs_map:
            prereqs_map[e.target_node_key].append(e.source_node_key)

    completed_node_keys: Set[str] = {
        n.node_key for n in nodes
        if progress_map.get(n.id) and progress_map[n.id].is_completed
    }

    formatted_nodes: List[GraphNodeResponse] = []
    
    for n in nodes:
        prog = progress_map.get(n.id)
        prereqs = prereqs_map.get(n.node_key, [])
        
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