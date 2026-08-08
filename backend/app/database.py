from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import DATABASE_URL

# Create the SQLAlchemy DB Engine
# pool_pre_ping=True checks if the DB connection is alive before executing queries
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    echo=False  
)

# Create a SessionLocal class for handling database transactions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for our SQLAlchemy ORM models
Base = declarative_base()


def get_db():
    """
    FastAPI Dependency that yields a clean DB session per HTTP request
    and closes it automatically when the request completes.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()