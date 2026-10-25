from datetime import datetime, timedelta, timezone
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.user import User, UserRole, StudentProfile, InstructorProfile
from app.schemas.auth import Token
from app.schemas.user import UserCreate, UserResponse, UserProfileUpdate
from app.core.config import ACCESS_TOKEN_EXPIRE_MINUTES

from app.core.security import (
    get_current_user,
    hash_password,
    verify_password,
    create_access_token,
)

router = APIRouter(prefix="/auth", tags=["Authentication & Profiles"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(
    user_in: UserCreate,
    db: Session = Depends(get_db)
) -> Any:
    """
    Register a new user (Student or Instructor) using the Profile-Extension Pattern.
    Creates base authentication credentials in `users` and automatically instantiates
    a corresponding specialized profile in `student_profiles` or `instructor_profiles`.
    """
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This email address already exists."
        )

    # Check unique student enrollment number if supplied
    if user_in.role == UserRole.STUDENT and user_in.enrollment_number:
        existing_enr = db.query(StudentProfile).filter(
            StudentProfile.enrollment_number == user_in.enrollment_number
        ).first()
        if existing_enr:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Enrollment / Roll number '{user_in.enrollment_number}' is already registered."
            )

    hashed_pwd = hash_password(user_in.password)
    
    # 1. Create Base User
    new_user = User(
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=hashed_pwd,
        role=user_in.role
    )
    db.add(new_user)
    db.flush()  # Obtain new_user.id for profile foreign key

    # 2. Automatically instantiate corresponding Profile extension
    if user_in.role == UserRole.STUDENT:
        student_profile = StudentProfile(
            user_id=new_user.id,
            department=user_in.department,
            program=user_in.program,
            semester=user_in.semester,
            batch=user_in.batch,
            enrollment_number=user_in.enrollment_number,
            academic_year=user_in.academic_year or user_in.semester,
            bio=user_in.bio,
            interests=user_in.interests
        )
        db.add(student_profile)
    elif user_in.role == UserRole.INSTRUCTOR:
        instructor_profile = InstructorProfile(
            user_id=new_user.id,
            department=user_in.department,
            designation=user_in.designation,
            qualifications=user_in.qualifications,
            expertise=user_in.expertise,
            bio=user_in.bio,
            office_hours=user_in.office_hours
        )
        db.add(instructor_profile)

    db.commit()

    # Eagerly load the user with their profile extension
    refreshed_user = (
        db.query(User)
        .options(
            joinedload(User.student_profile),
            joinedload(User.instructor_profile)
        )
        .filter(User.id == new_user.id)
        .first()
    )

    return refreshed_user


@router.post("/login", response_model=Token)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
) -> Any:
    """
    OAuth2 compatible token login.
    Accepts form-data with `username` (email) and `password`.
    Returns a JWT access token containing subject ID and user role.
    """
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account."
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    access_token = create_access_token(
        subject=str(user.id),
        role=user.role.value,
        expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


def _ensure_and_fetch_profile(db: Session, user: User) -> User:
    """
    Guarantees that a profile extension record exists for legacy or newly authenticated users,
    and returns the User object eagerly loaded with its extension.
    """
    if user.role == UserRole.STUDENT and not user.student_profile:
        new_prof = StudentProfile(user_id=user.id)
        db.add(new_prof)
        db.commit()
    elif user.role == UserRole.INSTRUCTOR and not user.instructor_profile:
        new_prof = InstructorProfile(user_id=user.id)
        db.add(new_prof)
        db.commit()

    refreshed = (
        db.query(User)
        .options(
            joinedload(User.student_profile),
            joinedload(User.instructor_profile)
        )
        .filter(User.id == user.id)
        .first()
    )
    return refreshed or user


@router.get("/me", response_model=UserResponse)
def read_users_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Fetch current authenticated user details seamlessly joined with their
    specialized profile extension (`student_profile` or `instructor_profile`).
    """
    return _ensure_and_fetch_profile(db, current_user)


@router.get("/profile", response_model=UserResponse)
def read_users_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Alias for /auth/me for explicit profile reading."""
    return _ensure_and_fetch_profile(db, current_user)


@router.put("/me", response_model=UserResponse)
def update_user_profile(
    profile_in: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Update personal user credentials and role-specific profile details.
    """
    # 1. Update Core User properties
    if profile_in.full_name is not None:
        current_user.full_name = profile_in.full_name.strip()

    # 2. Update Student Profile if applicable
    if current_user.role == UserRole.STUDENT:
        student_prof = current_user.student_profile
        if not student_prof:
            student_prof = StudentProfile(user_id=current_user.id)
            db.add(student_prof)

        if profile_in.department is not None:
            student_prof.department = profile_in.department
        if profile_in.program is not None:
            student_prof.program = profile_in.program
        if profile_in.semester is not None:
            student_prof.semester = profile_in.semester
        if profile_in.batch is not None:
            student_prof.batch = profile_in.batch
        if profile_in.academic_year is not None:
            student_prof.academic_year = profile_in.academic_year
        if profile_in.interests is not None:
            student_prof.interests = profile_in.interests
        if profile_in.bio is not None:
            student_prof.bio = profile_in.bio

        if profile_in.enrollment_number is not None and profile_in.enrollment_number != student_prof.enrollment_number:
            existing = db.query(StudentProfile).filter(
                StudentProfile.enrollment_number == profile_in.enrollment_number,
                StudentProfile.user_id != current_user.id
            ).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Enrollment number '{profile_in.enrollment_number}' is already taken."
                )
            student_prof.enrollment_number = profile_in.enrollment_number

        student_prof.updated_at = datetime.now(timezone.utc)

    # 3. Update Instructor Profile if applicable
    elif current_user.role == UserRole.INSTRUCTOR:
        instructor_prof = current_user.instructor_profile
        if not instructor_prof:
            instructor_prof = InstructorProfile(user_id=current_user.id)
            db.add(instructor_prof)

        if profile_in.department is not None:
            instructor_prof.department = profile_in.department
        if profile_in.designation is not None:
            instructor_prof.designation = profile_in.designation
        if profile_in.qualifications is not None:
            instructor_prof.qualifications = profile_in.qualifications
        if profile_in.expertise is not None:
            instructor_prof.expertise = profile_in.expertise
        if profile_in.office_hours is not None:
            instructor_prof.office_hours = profile_in.office_hours
        if profile_in.bio is not None:
            instructor_prof.bio = profile_in.bio

        instructor_prof.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(current_user)

    return _ensure_and_fetch_profile(db, current_user)
