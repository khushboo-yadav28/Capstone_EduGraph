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
            conn.execute(text("ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS set_number INTEGER DEFAULT 1;"))
        logging.info("Database schema synchronized successfully (quiz_attempts.set_number confirmed).")
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


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok"}


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
