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
from app.services.enrollment_service import update_course_progress_and_badge

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
    Evaluates quiz submission for a specific set number. Records attempt, updates individual 
    set progress, and marks the node as completed ONLY if all required sets are passed.
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

    # 1. Record Attempt
    attempt = QuizAttempt(
        student_id=current_user.id,
        node_id=node_id,
        set_number=set_number,
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

    # 3. Check if ALL required sets are passed for this node
    passed_sets_count = db.query(StudentQuizSetProgress).filter(
        StudentQuizSetProgress.student_id == current_user.id,
        StudentQuizSetProgress.node_id == node_id,
        StudentQuizSetProgress.is_passed == True
    ).count()

    node_fully_completed = (passed_sets_count >= TOTAL_REQUIRED_SETS)

    # Ensure StudentProgress record exists and is unlocked
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

    # 4. If all sets are passed, complete node and unlock downstream DAG nodes
    if node_fully_completed:
        if not progress.is_completed:
            progress.is_completed = True
            progress.completed_at = datetime.now(timezone.utc)

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

            completed_prereqs_count = db.query(StudentProgress).filter(
                StudentProgress.student_id == current_user.id,
                StudentProgress.node_id.in_(prereq_node_ids),
                StudentProgress.is_completed == True
            ).count()

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
    update_course_progress_and_badge(db, current_user.id, node.course_id)

    return BatchQuizEvaluationResponse(
        attempt_id=attempt.id,
        set_number=set_number,
        score_percentage=score_pct,
        total_questions=total_expected_questions,
        correct_answers_count=correct_count,
        is_passed=is_passed,
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
    course_node_ids = db.query(Node.id).filter(Node.course_id == course_id).all()
    node_ids = [n[0] for n in course_node_ids]

    progress_records = db.query(StudentProgress).filter(
        StudentProgress.student_id == current_user.id,
        StudentProgress.node_id.in_(node_ids)
    ).all()

    return progress_records


# import random
# from datetime import datetime, timezone
# from typing import List
# from uuid import UUID
# from fastapi import APIRouter, Depends, HTTPException, status
# from sqlalchemy.orm import Session
# from sqlalchemy import func

# from app.database import get_db
# from app.models.user import User, UserRole
# from app.models.course import Node, Edge, UserCourseEnrollment
# from app.models.quiz import Quiz, QuizAttempt, StudentProgress
# from app.schemas.quiz import (
#     QuizPublicResponse,
#     BatchQuizSubmitRequest,
#     BatchQuizEvaluationResponse,
#     QuestionFeedback,
#     StudentProgressResponse,
# )
# from app.core.security import get_current_user, require_roles
# from app.services.enrollment_service import update_course_progress_and_badge

# router = APIRouter(prefix="/quizzes", tags=["Quizzes & Progress"])

# PASSING_SCORE_PERCENTAGE = 70.0  # Threshold to complete node and unlock next DAG nodes
# DEFAULT_QUIZ_COUNT = 10

# @router.get("/node/{node_id}/questions", response_model=List[QuizPublicResponse])
# def get_random_node_quizzes(
#     node_id: UUID,
#     count: int = DEFAULT_QUIZ_COUNT,
#     db: Session = Depends(get_db),
#     current_user: User = Depends(require_roles([UserRole.STUDENT, UserRole.INSTRUCTOR, UserRole.ADMIN]))
# ):
#     """
#     Retrieves a randomized batch of N questions (default: 10) for a given node.
#     Hides correct answers and explanations from the student payload.
#     """
#     node = db.query(Node).filter(Node.id == node_id).first()
#     if not node:
#         raise HTTPException(
#             status_code=status.HTTP_404_NOT_FOUND,
#             detail="Node not found."
#         )

#     # Fetch all quizzes for this node and sample randomly
#     quizzes = db.query(Quiz).filter(Quiz.node_id == node_id).all()
#     if not quizzes:
#         raise HTTPException(
#             status_code=status.HTTP_404_NOT_FOUND,
#             detail="No quizzes found for this learning node."
#         )

#     sampled_quizzes = random.sample(quizzes, min(len(quizzes), count))
#     return sampled_quizzes


# @router.post("/node/{node_id}/submit", response_model=BatchQuizEvaluationResponse)
# def submit_node_quiz(
#     node_id: UUID,
#     submission: BatchQuizSubmitRequest,
#     db: Session = Depends(get_db),
#     current_user: User = Depends(require_roles([UserRole.STUDENT, UserRole]))
# ):
#     """
#     Evaluates quiz submission, computes score percentage, records attempt,
#     and updates node completion + unlocks downstream DAG nodes if passed (>= 70%).
#     """
#     node = db.query(Node).filter(Node.id == node_id).first()
#     if not node:
#         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Node not found.")

#     enrollment = db.query(UserCourseEnrollment).filter(
#         UserCourseEnrollment.student_id == current_user.id,
#         UserCourseEnrollment.course_id == node.course_id
#     ).first()
    
#     if not enrollment:
#         raise HTTPException(
#             status_code=status.HTTP_403_FORBIDDEN, 
#             detail="You must be enrolled in this course to attempt quizzes."
#         )

#     # Fetch total available quizzes for this node to determine accurate denominator
#     all_node_quizzes = db.query(Quiz).filter(Quiz.node_id == node_id).all()
#     if not all_node_quizzes:
#         raise HTTPException(
#             status_code=status.HTTP_400_BAD_REQUEST,
#             detail="No quiz questions configured for this node."
#         )

#     # Max questions expected for an evaluation batch (e.g. min of 10 or total DB count)
#     total_expected_questions = min(len(all_node_quizzes), DEFAULT_QUIZ_COUNT)

#     quiz_ids = [ans.quiz_id for ans in submission.answers]
#     quizzes = db.query(Quiz).filter(Quiz.id.in_(quiz_ids), Quiz.node_id == node_id).all()
#     quiz_map = {q.id: q for q in quizzes}

#     correct_count = 0
#     feedback_list: List[QuestionFeedback] = []

#     for ans in submission.answers:
#         quiz = quiz_map.get(ans.quiz_id)
#         if not quiz:
#             continue

#         is_correct = (ans.selected_option_index == quiz.correct_option_index)
#         if is_correct:
#             correct_count += 1

#         feedback_list.append(
#             QuestionFeedback(
#                 quiz_id=quiz.id,
#                 question_text=quiz.question_text,
#                 selected_option_index=ans.selected_option_index,
#                 correct_option_index=quiz.correct_option_index,
#                 is_correct=is_correct,
#                 explanation=quiz.explanation or "No explanation provided for this question."
#             )
#         )

#     # total_questions = len(submission.answers)
#     total_questions = total_expected_questions
#     score_pct = round((correct_count / total_questions) * 100.0, 2) if total_questions > 0 else 0.0
#     is_passed = score_pct >= PASSING_SCORE_PERCENTAGE

#     # 1. Record Attempt
#     attempt = QuizAttempt(
#         student_id=current_user.id,
#         node_id=node_id,
#         score_percentage=score_pct,
#         is_passed=is_passed,
#         attempted_at=datetime.now(timezone.utc)
#     )
#     db.add(attempt)
#     db.flush()

#     # 2. Update Student Progress
#     progress = db.query(StudentProgress).filter(
#         StudentProgress.student_id == current_user.id,
#         StudentProgress.node_id == node_id
#     ).first()

#     if not progress:
#         progress = StudentProgress(
#             student_id=current_user.id,
#             node_id=node_id,
#             is_unlocked=True,
#             unlocked_at=datetime.now(timezone.utc)
#         )
#         db.add(progress)

#     unlocked_next_node_keys = []

#     if is_passed:
#         if not progress.is_completed:
#             progress.is_completed = True
#             progress.completed_at = datetime.now(timezone.utc)

#         # 3. DAG Progression Engine: Unlock downstream dependent nodes
#         # Find all edges originating from this node's node_key
#         outgoing_edges = db.query(Edge).filter(
#             Edge.course_id == node.course_id,
#             Edge.source_node_key == node.node_key
#         ).all()

#         for edge in outgoing_edges:
#             target_node = db.query(Node).filter(
#                 Node.course_id == node.course_id,
#                 Node.node_key == edge.target_node_key
#             ).first()

#             if not target_node:
#                 continue

#             # Check if ALL prerequisites for target_node are completed
#             prereq_edges = db.query(Edge).filter(
#                 Edge.course_id == node.course_id,
#                 Edge.target_node_key == target_node.node_key
#             ).all()

#             prereq_source_keys = [e.source_node_key for e in prereq_edges]
#             prereq_nodes = db.query(Node).filter(
#                 Node.course_id == node.course_id,
#                 Node.node_key.in_(prereq_source_keys)
#             ).all()
#             prereq_node_ids = [n.id for n in prereq_nodes]

#             # Count how many prerequisites the student has completed
#             completed_prereqs_count = db.query(StudentProgress).filter(
#                 StudentProgress.student_id == current_user.id,
#                 StudentProgress.node_id.in_(prereq_node_ids),
#                 StudentProgress.is_completed == True
#             ).count()

#             # If all prerequisites are fulfilled, unlock target node
#             if completed_prereqs_count == len(prereq_node_ids):
#                 target_progress = db.query(StudentProgress).filter(
#                     StudentProgress.student_id == current_user.id,
#                     StudentProgress.node_id == target_node.id
#                 ).first()

#                 if not target_progress:
#                     target_progress = StudentProgress(
#                         student_id=current_user.id,
#                         node_id=target_node.id,
#                         is_unlocked=True,
#                         unlocked_at=datetime.now(timezone.utc)
#                     )
#                     db.add(target_progress)
#                 elif not target_progress.is_unlocked:
#                     target_progress.is_unlocked = True
#                     target_progress.unlocked_at = datetime.now(timezone.utc)

#                 unlocked_next_node_keys.append(target_node.node_key)

#     db.commit()

#     # Recalculate course overall completion percentage
#     update_course_progress_and_badge(db, current_user.id, node.course_id)

#     return BatchQuizEvaluationResponse(
#         attempt_id=attempt.id,
#         score_percentage=score_pct,
#         total_questions=total_questions,
#         correct_answers_count=correct_count,
#         is_passed=is_passed,
#         unlocked_next_node_keys=unlocked_next_node_keys,
#         feedback=feedback_list
#     )


# @router.get("/course/{course_id}/progress", response_model=List[StudentProgressResponse])
# def get_student_course_progress(
#     course_id: UUID,
#     db: Session = Depends(get_db),
#     current_user: User = Depends(get_current_user)
# ):
#     """
#     Returns unlock and completion progress for all nodes in a given course for the current student.
#     """
#     course_node_ids = db.query(Node.id).filter(Node.course_id == course_id).all()
#     node_ids = [n[0] for n in course_node_ids]

#     progress_records = db.query(StudentProgress).filter(
#         StudentProgress.student_id == current_user.id,
#         StudentProgress.node_id.in_(node_ids)
#     ).all()

#     return progress_records