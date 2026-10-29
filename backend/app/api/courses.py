# app/api/courses.py

from datetime import datetime, timezone, timedelta

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

