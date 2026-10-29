import random
from datetime import datetime, timezone
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.models.course import Node, Edge, UserCourseEnrollment
from app.models.quiz import Quiz, QuizAttempt, StudentProgress, StudentQuizSetProgress
from app.schemas.quiz import (
    QuizPublicResponse,
    BatchQuizSubmitRequest,
    BatchQuizEvaluationResponse,
    QuestionFeedback,
    StudentProgressResponse,
)
from app.core.security import get_current_user, require_roles
from app.services.enrollment_service import update_course_progress_and_badge, evaluate_sequential_student_progress

router = APIRouter(prefix="/quizzes", tags=["Quizzes & Progress"])

PASSING_SCORE_PERCENTAGE = 70.0
DEFAULT_QUIZ_COUNT = 10
TOTAL_REQUIRED_SETS = 2  # Set 1 and Set 2 required to complete a node


@router.get("/node/{node_id}/questions", response_model=List[QuizPublicResponse])
def get_random_node_quizzes(
    node_id: UUID,
    set_number: int = 1,
    count: int = DEFAULT_QUIZ_COUNT,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.STUDENT, UserRole.INSTRUCTOR, UserRole.ADMIN]))
):
    """
    Retrieves a randomized batch of N questions for a specific quiz set (e.g., set_number=1 or 2).
    """
    node = db.query(Node).filter(Node.id == node_id).first()
    if not node:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Node not found.")

    quizzes = db.query(Quiz).filter(
        Quiz.node_id == node_id, 
        Quiz.set_number == set_number
    ).all()
    
    if not quizzes:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No quizzes found for this learning node under set {set_number}."
        )

    sampled_quizzes = random.sample(quizzes, min(len(quizzes), count))
    return sampled_quizzes


@router.post("/node/{node_id}/submit", response_model=BatchQuizEvaluationResponse)
def submit_node_quiz(
    node_id: UUID,
    submission: BatchQuizSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.STUDENT]))
):
    """
    Evaluates quiz submission for a specific set number. Records attempt, stores score in score column,
    updates module-wise progress (50% for 1 set, 100% for 2 sets), and marks the node as completed
    and unlocks downstream DAG nodes when all required sets are passed.
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

    # Enforce strict sequential check: module must be unlocked before attempting quiz
    sorted_nodes, pre_evals = evaluate_sequential_student_progress(db, current_user.id, node.course_id, auto_commit=False)
    target_eval = pre_evals.get(node_id)
    if not target_eval or not target_eval["is_unlocked"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This module is locked. You must complete and pass all preceding modules in sequential order before attempting this quiz."
        )

    set_number = submission.set_number

    # Fetch total quizzes available for this specific set
    all_set_quizzes = db.query(Quiz).filter(
        Quiz.node_id == node_id,
        Quiz.set_number == set_number
    ).all()
    
    if not all_set_quizzes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No quiz questions configured for set {set_number} on this node."
        )

    total_expected_questions = min(len(all_set_quizzes), DEFAULT_QUIZ_COUNT)

    quiz_ids = [ans.quiz_id for ans in submission.answers]
    quizzes = db.query(Quiz).filter(
        Quiz.id.in_(quiz_ids), 
        Quiz.node_id == node_id,
        Quiz.set_number == set_number
    ).all()
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
                explanation=quiz.explanation or "No explanation provided."
            )
        )

    score_pct = round((correct_count / total_expected_questions) * 100.0, 2) if total_expected_questions > 0 else 0.0
    is_passed = score_pct >= PASSING_SCORE_PERCENTAGE

    # 1. Record Attempt with calculated score stored in score column
    attempt = QuizAttempt(
        student_id=current_user.id,
        node_id=node_id,
        set_number=set_number,
        score=score_pct,  # Correctly stored in score column
        score_percentage=score_pct,
        is_passed=is_passed,
        attempted_at=datetime.now(timezone.utc)
    )
    db.add(attempt)
    db.flush()

    # 2. Update Student Quiz Set Progress
    set_progress = db.query(StudentQuizSetProgress).filter(
        StudentQuizSetProgress.student_id == current_user.id,
        StudentQuizSetProgress.node_id == node_id,
        StudentQuizSetProgress.set_number == set_number
    ).first()

    if not set_progress:
        set_progress = StudentQuizSetProgress(
            student_id=current_user.id,
            node_id=node_id,
            set_number=set_number,
            is_passed=is_passed,
            passed_at=datetime.now(timezone.utc) if is_passed else None
        )
        db.add(set_progress)
    elif not set_progress.is_passed and is_passed:
        set_progress.is_passed = True
        set_progress.passed_at = datetime.now(timezone.utc)

    db.flush()

    # 3. Dynamic Module Progress Calculation
    passed_sets_count = db.query(StudentQuizSetProgress).filter(
        StudentQuizSetProgress.student_id == current_user.id,
        StudentQuizSetProgress.node_id == node_id,
        StudentQuizSetProgress.is_passed == True
    ).count()

    node_fully_completed = (passed_sets_count >= TOTAL_REQUIRED_SETS)
    # Granular module progress: 1 passed = 50.0%, 2 passed = 100.0%
    module_progress_percentage = min(100.0, round((passed_sets_count / float(TOTAL_REQUIRED_SETS)) * 100.0, 1))

    # Ensure StudentProgress record exists and update its progress_percentage
    progress = db.query(StudentProgress).filter(
        StudentProgress.student_id == current_user.id,
        StudentProgress.node_id == node_id
    ).first()

    if not progress:
        progress = StudentProgress(
            student_id=current_user.id,
            node_id=node_id,
            is_unlocked=True,
            progress_percentage=module_progress_percentage,
            is_completed=node_fully_completed,
            unlocked_at=datetime.now(timezone.utc),
            completed_at=datetime.now(timezone.utc) if node_fully_completed else None
        )
        db.add(progress)
    else:
        progress.progress_percentage = module_progress_percentage
        if node_fully_completed and not progress.is_completed:
            progress.is_completed = True
            progress.completed_at = datetime.now(timezone.utc)

    db.commit()

    # Enforce global sequential unlock and synchronize all progress records
    seq_nodes, post_evals = evaluate_sequential_student_progress(db, current_user.id, node.course_id, auto_commit=True)
    update_course_progress_and_badge(db, current_user.id, node.course_id)

    # Determine any newly unlocked next node key in the linear sequence
    unlocked_next_node_keys = []
    current_idx = next((i for i, n in enumerate(seq_nodes) if n.id == node_id), -1)
    if current_idx >= 0 and current_idx + 1 < len(seq_nodes):
        next_node = seq_nodes[current_idx + 1]
        if post_evals.get(next_node.id, {}).get("is_unlocked"):
            unlocked_next_node_keys.append(next_node.node_key)

    return BatchQuizEvaluationResponse(
        attempt_id=attempt.id,
        set_number=set_number,
        score=score_pct,
        score_percentage=score_pct,
        total_questions=total_expected_questions,
        correct_answers_count=correct_count,
        is_passed=is_passed,
        node_progress_percentage=module_progress_percentage,
        node_fully_completed=node_fully_completed,
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
    Returns unlock, completion, and granular module progress (0%, 50%, 100%) for all nodes in a course,
    strictly enforcing sequential progression order.
    """
    sorted_nodes, node_evals = evaluate_sequential_student_progress(db, current_user.id, course_id, auto_commit=True)

    result: List[StudentProgressResponse] = []
    for n in sorted_nodes:
        ev = node_evals.get(n.id, {})
        result.append(
            StudentProgressResponse(
                id=ev.get("id") or 0,
                student_id=current_user.id,
                node_id=n.id,
                is_unlocked=ev.get("is_unlocked", False),
                is_completed=ev.get("is_completed", False),
                progress_percentage=ev.get("progress_percentage", 0.0),
                passed_sets_count=ev.get("passed_sets_count", 0),
                unlocked_at=ev.get("unlocked_at"),
                completed_at=ev.get("completed_at")
            )
        )

    return result
