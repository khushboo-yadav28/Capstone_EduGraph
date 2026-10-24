# app/init_db.py
from sqlalchemy import text
from app.database import engine, Base
import app.models 

def create_tables():
    print("Creating all database tables in PostgreSQL...")
    Base.metadata.create_all(bind=engine)
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS set_number INTEGER DEFAULT 1;"))
        conn.execute(text("ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS set_number INTEGER DEFAULT 1;"))
    print("Tables and columns synchronized successfully!")

if __name__ == "__main__":
    create_tables()
