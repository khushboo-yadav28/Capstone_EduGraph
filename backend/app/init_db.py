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
        conn.execute(text("ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS program VARCHAR(100);"))
        conn.execute(text("ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS semester VARCHAR(50);"))
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
    print("Tables, columns, and profile extensions synchronized successfully!")

if __name__ == "__main__":
    create_tables()
