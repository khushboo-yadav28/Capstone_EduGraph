from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from uuid import UUID
from app.models.quiz import DifficultyLevel


# --- Quiz Schemas ---
class QuizBase(BaseModel):
    question_text: str = Field(..., example="What is the output of type([]) in Python?")
    options: List[str] = Field(
        ..., 
        min_items=2, 
        max_items=6, 
        example=["<class 'list'>", "<class 'tuple'>", "<class 'dict'>", "<class 'set'>"]
    )
    correct_option_index: int = Field(..., ge=0, le=5, example=0)
    explanation: Optional[str] = Field(None, example="In Python, square brackets denote a mutable sequence called a list.")
    difficulty: DifficultyLevel = Field(default=DifficultyLevel.EASY)


class QuizCreate(QuizBase):
    node_id: UUID


class QuizResponse(QuizBase):
    id: int
    node_id: UUID

    class Config:
        from_attributes = True


# --- Quiz Submission & Attempt Schemas ---
class QuizSubmitRequest(BaseModel):
    selected_option_index: int = Field(..., ge=0, le=5)


class QuizAttemptResponse(BaseModel):
    id: int
    student_id: UUID
    node_id: UUID
    score_percentage: float = Field(..., example=100.0)
    is_passed: bool = Field(..., example=True)
    attempted_at: datetime

    class Config:
        from_attributes = True


# --- Student Node Progress Schemas ---
class StudentProgressResponse(BaseModel):
    id: int
    student_id: UUID
    node_id: UUID
    is_unlocked: bool
    is_completed: bool
    unlocked_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class QuizPublicResponse(BaseModel):
    """Public version of Quiz schema for students - hides correct answer and explanation."""
    id: int
    node_id: UUID
    question_text: str
    options: List[str]
    difficulty: DifficultyLevel

    class Config:
        from_attributes = True


class SingleAnswerSubmit(BaseModel):
    quiz_id: int
    selected_option_index: int = Field(..., ge=0, le=5)


class BatchQuizSubmitRequest(BaseModel):
    answers: List[SingleAnswerSubmit] = Field(..., min_items=1)


class QuestionFeedback(BaseModel):
    quiz_id: int
    question_text: str
    selected_option_index: int
    correct_option_index: int
    is_correct: bool
    explanation: Optional[str] = None


class BatchQuizEvaluationResponse(BaseModel):
    attempt_id: int
    score_percentage: float
    total_questions: int
    correct_answers_count: int
    is_passed: bool
    unlocked_next_node_keys: List[str] = []
    feedback: List[QuestionFeedback]