from typing import List, Optional
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload
from app.models.course import Course, CourseStatus, Category
from app.models.user import User, UserRole
from app.models.course import Node, Edge
from app.models.quiz import Quiz
from app.schemas.course import CourseCreate, CategoryCreate


# --- Category Services ---
def create_category(db: Session, category_data: CategoryCreate, current_user: User) -> Category:
    """Only Admins can create course categories."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only system administrators can create categories."
        )

    existing_cat = db.query(Category).filter(Category.name == category_data.name).first()
    if existing_cat:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Category '{category_data.name}' already exists."
        )

    new_category = Category(
        name=category_data.name,
        description=category_data.description
    )
    db.add(new_category)
    db.commit()
    db.refresh(new_category)
    return new_category


def get_all_categories(db: Session) -> List[Category]:
    """Retrieve all available course categories."""
    return db.query(Category).all()


# --- Course Services ---
def create_course(db: Session, course_data: CourseCreate, current_user: User) -> Course:
    """Instructors and Admins can create courses."""
    if current_user.role not in [UserRole.INSTRUCTOR, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only instructors and administrators can create courses."
        )

    category = db.query(Category).filter(Category.id == course_data.category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Specified category does not exist."
        )

    new_course = Course(
        title=course_data.title,
        description=course_data.description,
        category_id=course_data.category_id,
        instructor_id=current_user.id,
        status=CourseStatus.DRAFT
    )
    db.add(new_course)
    db.commit()
    db.refresh(new_course)
    return new_course


def get_course_by_id(db: Session, course_id: UUID) -> Course:
    """Fetches a course by ID with eager-loaded nodes and edges for the graph viewer."""
    course = (
        db.query(Course)
        .options(joinedload(Course.nodes), joinedload(Course.edges))
        .filter(Course.id == course_id)
        .first()
    )
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Course with ID '{course_id}' not found."
        )
    return course


def get_published_courses(db: Session, skip: int = 0, limit: int = 20) -> List[Course]:
    """Retrieves all public/published courses for student browsing."""
    return (
        db.query(Course)
        .filter(Course.status == CourseStatus.PUBLISHED)
        .offset(skip)
        .limit(limit)
        .all()
    )


def publish_course(db: Session, course_id: UUID, current_user: User) -> Course:
    """Changes course status from DRAFT to PUBLISHED after validating node structure."""
    course = get_course_by_id(db, course_id)

    if course.instructor_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to modify this course."
        )

    if not course.nodes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot publish a course without any learning nodes."
        )

    course.status = CourseStatus.PUBLISHED
    db.commit()
    db.refresh(course)
    return course


def delete_course(db: Session, course_id: UUID, current_user: User) -> None:
    """Deletes a course and cascades deletion to associated nodes, edges, and enrollments."""
    course = get_course_by_id(db, course_id)

    if course.instructor_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this course."
        )

    db.delete(course)
    db.commit()

def save_generated_graph_to_course(
    db: Session, 
    course_id: UUID, 
    graph_data: dict, 
    current_user: User
) -> Course:
    """
    Saves Gemini-generated nodes, edges, and quizzes into the database for a specific course.
    """
    course = get_course_by_id(db, course_id)

    if course.instructor_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this course."
        )

    # 1. Update Course Title and Description if updated by extraction
    if graph_data.get("title"):
        course.title = graph_data["title"]
    if graph_data.get("description"):
        course.description = graph_data["description"]

    # 2. Add Nodes and their Quizzes
    node_key_to_model_map = {}
    for node_dict in graph_data.get("nodes", []):
        new_node = Node(
            course_id=course.id,
            node_key=node_dict["node_key"],
            title=node_dict["title"],
            summary=node_dict["summary"],
            page_references=node_dict.get("page_references"),
            youtube_url=node_dict.get("youtube_url"),
            youtube_timestamp_seconds=node_dict.get("youtube_timestamp_seconds"),
            position_x=node_dict.get("position_x", 0.0),
            position_y=node_dict.get("position_y", 0.0),
        )
        db.add(new_node)
        db.flush()  # Assigns primary key UUID to new_node.id
        node_key_to_model_map[new_node.node_key] = new_node

        # Save 20 Quizzes per Node
        for quiz_dict in node_dict.get("quizzes", []):
            new_quiz = Quiz(
                node_id=new_node.id,
                question_text=quiz_dict["question_text"],
                options=quiz_dict["options"],
                correct_option_index=quiz_dict["correct_option_index"],
                explanation=quiz_dict.get("explanation"),
                difficulty=quiz_dict.get("difficulty")
            )
            db.add(new_quiz)

    # 3. Add Edges
    for edge_dict in graph_data.get("edges", []):
        new_edge = Edge(
            course_id=course.id,
            source_node_key=edge_dict["source_node_key"],
            target_node_key=edge_dict["target_node_key"]
        )
        db.add(new_edge)

    db.commit()
    db.refresh(course)
    return course