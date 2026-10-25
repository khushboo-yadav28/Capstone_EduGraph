import enum
from datetime import datetime, timezone
import uuid
from sqlalchemy import UUID, Column, Integer, String, Boolean, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base


class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    INSTRUCTOR = "INSTRUCTOR"
    STUDENT = "STUDENT"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.STUDENT, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Core LMS Relationships
    courses = relationship("Course", back_populates="instructor", cascade="all, delete-orphan")
    progress = relationship("StudentProgress", back_populates="student", cascade="all, delete-orphan")
    quiz_attempts = relationship("QuizAttempt", back_populates="student", cascade="all, delete-orphan")
    enrollments = relationship("UserCourseEnrollment", back_populates="student", cascade="all, delete-orphan")

    # Profile Extension Pattern Relationships (1-to-1)
    student_profile = relationship(
        "StudentProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="joined"
    )
    instructor_profile = relationship(
        "InstructorProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="joined"
    )


class StudentProfile(Base):
    """
    Profile extension storing student-specific academic, enrollment, and biographical information.
    """
    __tablename__ = "student_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True
    )

    department = Column(String(100), nullable=True)          # e.g., "Computer Science & Engineering"
    program = Column(String(100), nullable=True)             # e.g., "M.Sc. IT", "B.Tech CS"
    semester = Column(String(50), nullable=True)              # e.g., "Semester 9"
    batch = Column(String(50), nullable=True)                 # e.g., "2024-2028"
    enrollment_number = Column(String(100), unique=True, nullable=True, index=True) # e.g., "STU-2026-001"
    academic_year = Column(String(50), nullable=True)         # e.g., "3rd Year"
    bio = Column(Text, nullable=True)
    interests = Column(String(255), nullable=True)            # e.g., "AI, Machine Learning, Graph Theory"

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    user = relationship("User", back_populates="student_profile")


class InstructorProfile(Base):
    """
    Profile extension storing instructor-specific academic credentials, expertise, and institutional data.
    """
    __tablename__ = "instructor_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True
    )

    department = Column(String(100), nullable=True)          # e.g., "Department of Computer Science"
    designation = Column(String(100), nullable=True)          # e.g., "Professor", "Lecturer", "Associate Professor"
    qualifications = Column(String(255), nullable=True)       # e.g., "Ph.D. in Computer Science", "M.Tech"
    expertise = Column(String(255), nullable=True)            # e.g., "Knowledge Graphs, RAG Systems, AI"
    bio = Column(Text, nullable=True)
    office_hours = Column(String(255), nullable=True)         # e.g., "Tue/Thu 2:00 PM - 4:00 PM"

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    user = relationship("User", back_populates="instructor_profile")
