import enum
from datetime import datetime, timezone
import uuid
from sqlalchemy import UUID, Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Enum, Float
from sqlalchemy.orm import relationship
from app.database import Base


class CourseStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"

class EnrollmentStatus(str, enum.Enum):
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    DROPPED = "DROPPED"

class Category(Base):
    __tablename__ = "categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)    
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)

    courses = relationship("Course", back_populates="category")


class Course(Base):
    __tablename__ = "courses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)    
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=False)
    instructor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    status = Column(Enum(CourseStatus), default=CourseStatus.DRAFT, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    category = relationship("Category", back_populates="courses")
    instructor = relationship("User", back_populates="courses")
    nodes = relationship("Node", back_populates="course", cascade="all, delete-orphan")
    edges = relationship("Edge", back_populates="course", cascade="all, delete-orphan")
    enrollments = relationship("UserCourseEnrollment", back_populates="course", cascade="all, delete-orphan")

class Node(Base):
    __tablename__ = "nodes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)    

    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)

    node_key = Column(String(50), nullable=False)  # e.g., 'node_1', 'node_2'
    title = Column(String(255), nullable=False)
    summary = Column(Text, nullable=False)
    page_references = Column(String(255), nullable=True)  # e.g., "Pages 12-15"
    youtube_url = Column(String(500), nullable=True)
    youtube_timestamp_seconds = Column(Integer, nullable=True)  # e.g., 220
    position_x = Column(Float, default=0.0)
    position_y = Column(Float, default=0.0)

    course = relationship("Course", back_populates="nodes")
    quizzes = relationship("Quiz", back_populates="node", cascade="all, delete-orphan")
    student_progress = relationship("StudentProgress", back_populates="node", cascade="all, delete-orphan")


class Edge(Base):
    __tablename__ = "edges"

    id = Column(Integer, primary_key=True, index=True)

    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    source_node_key = Column(String(50), nullable=False)
    target_node_key = Column(String(50), nullable=False)

    course = relationship("Course", back_populates="edges")


class UserCourseEnrollment(Base):
    """Tracks overall student enrollment and course completion status."""
    __tablename__ = "user_course_enrollments"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    status = Column(Enum(EnrollmentStatus), default=EnrollmentStatus.IN_PROGRESS, nullable=False)
    progress_percentage = Column(Float, default=0.0)  # e.g., 75.0%
    enrolled_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime(timezone=True), nullable=True)

    student = relationship("User", back_populates="enrollments")
    course = relationship("Course", back_populates="enrollments")
    badge = relationship("Badge", back_populates="enrollment", uselist=False, cascade="all, delete-orphan")


class Badge(Base):
    """Stores completion badges/certificates issued to students."""
    __tablename__ = "badges"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    enrollment_id = Column(Integer, ForeignKey("user_course_enrollments.id", ondelete="CASCADE"), nullable=False, unique=True)
    badge_title = Column(String(255), nullable=False)  # e.g., "Master of System Design Graph"
    badge_image_url = Column(String(500), nullable=True)
    issued_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    enrollment = relationship("UserCourseEnrollment", back_populates="badge")