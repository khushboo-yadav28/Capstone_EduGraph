from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.database import Base, engine
import app.models
from app.api import quiz, enrollment, courses, auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure all tables and required columns exist in PostgreSQL
    try:
        Base.metadata.create_all(bind=engine)
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS set_number INTEGER DEFAULT 1;"))
            conn.execute(text("ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS score FLOAT;"))
            conn.execute(text("ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS set_number INTEGER DEFAULT 1;"))
            conn.execute(text("ALTER TABLE student_progress ADD COLUMN IF NOT EXISTS progress_percentage FLOAT DEFAULT 0.0;"))
            
            # Backfill quiz_attempts.score from score_percentage if score is null
            conn.execute(text("UPDATE quiz_attempts SET score = score_percentage WHERE score IS NULL;"))
            
            # Ensure student_profiles has program and semester columns
            conn.execute(text("ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS program VARCHAR(100);"))
            conn.execute(text("ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS semester VARCHAR(50);"))
            
            # Backfill profile extension rows for any existing users
            conn.execute(text("""
                INSERT INTO student_profiles (id, user_id, created_at, updated_at)
                SELECT gen_random_uuid(), id, now(), now()
                FROM users
                WHERE role = 'STUDENT'
                  AND id NOT IN (SELECT user_id FROM student_profiles)
                ON CONFLICT (user_id) DO NOTHING;
            """))
            conn.execute(text("""
                INSERT INTO instructor_profiles (id, user_id, created_at, updated_at)
                SELECT gen_random_uuid(), id, now(), now()
                FROM users
                WHERE role = 'INSTRUCTOR'
                  AND id NOT IN (SELECT user_id FROM instructor_profiles)
                ON CONFLICT (user_id) DO NOTHING;
            """))

        logging.info("Database schema synchronized successfully (models, tables, and profile extensions confirmed).")
    except Exception as e:
        logging.warning(f"Database schema auto-sync warning: {e}")
    yield


app = FastAPI(
    title="Graph LMS API",
    description="Knowledge Graph based Learning Management System",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(auth.router)
app.include_router(quiz.router)
app.include_router(courses.router)
app.include_router(enrollment.router)


@app.get("/", tags=["Health Check"])
def root():
    return {"message": "EduGraph Adaptive Learning API is running successfully."}


@app.get("/health", tags=["Health Check"])
def health_check():
    return {"status": "healthy"}
