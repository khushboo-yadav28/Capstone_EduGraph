import enum
from datetime import datetime, timezone
from sqlalchemy import UUID, Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey, Enum, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base


class DifficultyLevel(str, enum.Enum):
    EASY = "EASY"
    MEDIUM = "MEDIUM"
    HARD = "HARD"


class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    node_id = Column(UUID(as_uuid=True), ForeignKey("nodes.id", ondelete="CASCADE"), nullable=False)
    set_number = Column(Integer, default=1, nullable=False)  # 1 for Quiz Set 1, 2 for Quiz Set 2
    question_text = Column(Text, nullable=False)
    options = Column(JSON, nullable=False)  # Stores Array of strings: ["Option A", "Option B", "Option C", "Option D"]
    correct_option_index = Column(Integer, nullable=False)  # 0, 1, 2, or 3
    explanation = Column(Text, nullable=True)
    difficulty = Column(Enum(DifficultyLevel), default=DifficultyLevel.EASY, nullable=False)

    node = relationship("Node", back_populates="quizzes")


class StudentProgress(Base):
    __tablename__ = "student_progress"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    node_id = Column(UUID(as_uuid=True), ForeignKey("nodes.id", ondelete="CASCADE"), nullable=False)
    is_unlocked = Column(Boolean, default=False)
    is_completed = Column(Boolean, default=False)
    progress_percentage = Column(Float, default=0.0, nullable=False)  # 0.0, 50.0, or 100.0 based on passed sets
    unlocked_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    student = relationship("User", back_populates="progress")
    node = relationship("Node", back_populates="student_progress")


class StudentQuizSetProgress(Base):
    """Tracks passing status for individual quiz sets (e.g. Set 1 vs Set 2) per node."""
    __tablename__ = "student_quiz_set_progress"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    node_id = Column(UUID(as_uuid=True), ForeignKey("nodes.id", ondelete="CASCADE"), nullable=False)
    set_number = Column(Integer, nullable=False)  # e.g., 1 or 2
    is_passed = Column(Boolean, default=False, nullable=False)
    passed_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint('student_id', 'node_id', 'set_number', name='uq_student_node_quiz_set'),
    )


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    node_id = Column(UUID(as_uuid=True), ForeignKey("nodes.id", ondelete="CASCADE"), nullable=False)
    set_number = Column(Integer, default=1, nullable=False)
    score = Column(Float, nullable=True)  # Calculated score percentage stored upon submission
    score_percentage = Column(Float, nullable=False)  # e.g., 80.0
    is_passed = Column(Boolean, nullable=False)
    attempted_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    student = relationship("User", back_populates="quiz_attempts")
    node = relationship("Node")
