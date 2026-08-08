import random
from datetime import datetime, timezone
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.user import User, UserRole
from app.models.course import Node, Edge, UserCourseEnrollment
from app.models.quiz import Quiz, QuizAttempt, StudentProgress
from app.schemas.quiz import (
    QuizPublicResponse,
    BatchQuizSubmitRequest,
    BatchQuizEvaluationResponse,
    QuestionFeedback,
    StudentProgressResponse,
)
from app.core.security import get_current_user, require_roles

router = APIRouter(prefix="/quizzes", tags=["Quizzes & Progress"])

PASSING_SCORE_PERCENTAGE = 70.0  # Threshold to complete node and unlock next DAG nodes


@router.get("/node/{node_id}/questions", response_model=List[QuizPublicResponse])
def get_random_node_quizzes(
    node_id: UUID,
    count: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.STUDENT, UserRole.INSTRUCTOR, UserRole.ADMIN]))
):
    """
    Retrieves a randomized batch of N questions (default: 10) for a given node.
    Hides correct answers and explanations from the student payload.
    """
    node = db.query(Node).filter(Node.id == node_id).first()
    if not node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Node not found."
        )

    # Fetch all quizzes for this node and sample randomly
    quizzes = db.query(Quiz).filter(Quiz.node_id == node_id).all()
    if not quizzes:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No quizzes found for this learning node."
        )

    sampled_quizzes = random.sample(quizzes, min(len(quizzes), count))
    return sampled_quizzes


@router.post("/node/{node_id}/submit", response_model=BatchQuizEvaluationResponse)
def submit_node_quiz(
    node_id: UUID,
    submission: BatchQuizSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.STUDENT, UserRole]))
):
    """
    Evaluates quiz submission, computes score percentage, records attempt,
    and updates node completion + unlocks downstream DAG nodes if passed (>= 70%).
    """
    node = db.query(Node).filter(Node.id == node_id).first()
    if not node:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Node not found.")

    enrollment = db.query(UserCourseEnrollment).filter(
        UserCourseEnrollment.student_id == current_user.id,
        UserCourseEnrollment.course_id == node.course_id
    ).first()
    
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="You must be enrolled in this course to attempt quizzes."
        )
    quiz_ids = [ans.quiz_id for ans in submission.answers]
    quizzes = db.query(Quiz).filter(Quiz.id.in_(quiz_ids), Quiz.node_id == node_id).all()
    quiz_map = {q.id: q for q in quizzes}

    correct_count = 0
    feedback_list: List[QuestionFeedback] = []

    for ans in submission.answers:
        quiz = quiz_map.get(ans.quiz_id)
        if not quiz:
            continue

        is_correct = (ans.selected_option_index == quiz.correct_option_index)
        if is_correct:
            correct_count += 1

        feedback_list.append(
            QuestionFeedback(
                quiz_id=quiz.id,
                question_text=quiz.question_text,
                selected_option_index=ans.selected_option_index,
                correct_option_index=quiz.correct_option_index,
                is_correct=is_correct,
                explanation=quiz.explanation
            )
        )

    total_questions = len(submission.answers)
    score_pct = round((correct_count / total_questions) * 100.0, 2) if total_questions > 0 else 0.0
    is_passed = score_pct >= PASSING_SCORE_PERCENTAGE

    # 1. Record Attempt
    attempt = QuizAttempt(
        student_id=current_user.id,
        node_id=node_id,
        score_percentage=score_pct,
        is_passed=is_passed,
        attempted_at=datetime.now(timezone.utc)
    )
    db.add(attempt)
    db.flush()

    # 2. Update Student Progress
    progress = db.query(StudentProgress).filter(
        StudentProgress.student_id == current_user.id,
        StudentProgress.node_id == node_id
    ).first()

    if not progress:
        progress = StudentProgress(
            student_id=current_user.id,
            node_id=node_id,
            is_unlocked=True,
            unlocked_at=datetime.now(timezone.utc)
        )
        db.add(progress)

    unlocked_next_node_keys = []

    if is_passed and not progress.is_completed:
        progress.is_completed = True
        progress.completed_at = datetime.now(timezone.utc)

        # 3. DAG Progression Engine: Unlock downstream dependent nodes
        # Find all edges originating from this node's node_key
        outgoing_edges = db.query(Edge).filter(
            Edge.course_id == node.course_id,
            Edge.source_node_key == node.node_key
        ).all()

        for edge in outgoing_edges:
            target_node = db.query(Node).filter(
                Node.course_id == node.course_id,
                Node.node_key == edge.target_node_key
            ).first()

            if not target_node:
                continue

            # Check if ALL prerequisites for target_node are completed
            prereq_edges = db.query(Edge).filter(
                Edge.course_id == node.course_id,
                Edge.target_node_key == target_node.node_key
            ).all()

            prereq_source_keys = [e.source_node_key for e in prereq_edges]
            prereq_nodes = db.query(Node).filter(
                Node.course_id == node.course_id,
                Node.node_key.in_(prereq_source_keys)
            ).all()
            prereq_node_ids = [n.id for n in prereq_nodes]

            # Count how many prerequisites the student has completed
            completed_prereqs_count = db.query(StudentProgress).filter(
                StudentProgress.student_id == current_user.id,
                StudentProgress.node_id.in_(prereq_node_ids),
                StudentProgress.is_completed == True
            ).count()

            # If all prerequisites are fulfilled, unlock target node
            if completed_prereqs_count == len(prereq_node_ids):
                target_progress = db.query(StudentProgress).filter(
                    StudentProgress.student_id == current_user.id,
                    StudentProgress.node_id == target_node.id
                ).first()

                if not target_progress:
                    target_progress = StudentProgress(
                        student_id=current_user.id,
                        node_id=target_node.id,
                        is_unlocked=True,
                        unlocked_at=datetime.now(timezone.utc)
                    )
                    db.add(target_progress)
                elif not target_progress.is_unlocked:
                    target_progress.is_unlocked = True
                    target_progress.unlocked_at = datetime.now(timezone.utc)

                unlocked_next_node_keys.append(target_node.node_key)

    db.commit()

    return BatchQuizEvaluationResponse(
        attempt_id=attempt.id,
        score_percentage=score_pct,
        total_questions=total_questions,
        correct_answers_count=correct_count,
        is_passed=is_passed,
        unlocked_next_node_keys=unlocked_next_node_keys,
        feedback=feedback_list
    )


@router.get("/course/{course_id}/progress", response_model=List[StudentProgressResponse])
def get_student_course_progress(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns unlock and completion progress for all nodes in a given course for the current student.
    """
    course_node_ids = db.query(Node.id).filter(Node.course_id == course_id).all()
    node_ids = [n[0] for n in course_node_ids]

    progress_records = db.query(StudentProgress).filter(
        StudentProgress.student_id == current_user.id,
        StudentProgress.node_id.in_(node_ids)
    ).all()

    return progress_records