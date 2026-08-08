# app/init_db.py
from app.database import engine, Base
import app.models 

def create_tables():
    print("Creating all database tables in PostgreSQL...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully!")

if __name__ == "__main__":
    create_tables()