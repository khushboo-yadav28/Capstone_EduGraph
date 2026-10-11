import logging
from app.database import engine, Base, SessionLocal
# Import all models so SQLAlchemy registers them before creating tables
from app.models import user, course, quiz
from app.services.seed_service import seed_all_initial_data

logging.basicConfig(level=logging.INFO)

def main():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        results = seed_all_initial_data(db)
        print("\n--- Seed Summary ---")
        print(f"Categories Processed: {results['categories_count']}")
        print(f"Users Processed:     {results['users_count']}")
        print("---------------------\n")
    except Exception as e:
        logging.error(f"Seeding failed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()