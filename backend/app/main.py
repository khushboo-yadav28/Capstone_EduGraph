from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from app.database import Base, engine
from app.api import quiz, enrollment
from app.api import courses
from app.api import auth # import course router if available

# Create DB tables if not using Alembic migrations
# Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Graph LMS API",
    description="Knowledge Graph based Learning Management System",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(quiz.router)
app.include_router(courses.router)
app.include_router(enrollment.router)
app.include_router(auth.router)

@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok"}


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)