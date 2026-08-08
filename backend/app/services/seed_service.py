import logging
from sqlalchemy.orm import Session
from app.models.user import User, UserRole
from app.models.course import Category
from app.core.security import hash_password,verify_password

logger = logging.getLogger(__name__)


DEFAULT_CATEGORIES = [
    {"name": "Computer Science", "description": "Algorithms, data structures, and software engineering principles."},
    {"name": "System Design", "description": "Distributed systems, microservices, and system architecture."},
    {"name": "Data Science & AI", "description": "Machine learning, neural networks, and data analytics."},
    {"name": "Web Development", "description": "Full-stack frameworks, APIs, and modern frontend design."}
]

DEFAULT_USERS = [
    {
        "full_name": "System Admin",
        "email": "admin@edugraph.com",
        "password": "AdminPassword123!",
        "role": UserRole.ADMIN,
    },
    {
        "full_name": "Dr. Sarah Connor",
        "email": "instructor@edugraph.com",
        "password": "InstructorPassword123!",
        "role": UserRole.INSTRUCTOR,
    },
    {
        "full_name": "Alex Mercer",
        "email": "student@edugraph.com",
        "password": "StudentPassword123!",
        "role": UserRole.STUDENT,
    },
]


def seed_categories(db: Session) -> list[Category]:
    """Seeds default course categories into the database."""
    created_categories = []
    for cat_data in DEFAULT_CATEGORIES:
        existing = db.query(Category).filter(Category.name == cat_data["name"]).first()
        if not existing:
            category = Category(
                name=cat_data["name"],
                description=cat_data["description"]
            )
            db.add(category)
            created_categories.append(category)
            logger.info(f"Seeded Category: {cat_data['name']}")
        else:
            created_categories.append(existing)
    
    db.commit()
    return created_categories


def seed_users(db: Session) -> list[User]:
    """Seeds default Admin, Instructor, and Student accounts."""
    created_users = []
    for user_data in DEFAULT_USERS:
        existing = db.query(User).filter(User.email == user_data["email"]).first()
        if not existing:
            hashed_pw = hash_password(user_data["password"])
            user = User(
                full_name=user_data["full_name"],
                email=user_data["email"],
                hashed_password=hashed_pw,
                role=user_data["role"],
                is_active=True
            )
            db.add(user)
            created_users.append(user)
            logger.info(f"Seeded User ({user_data['role']}): {user_data['email']}")
        else:
            created_users.append(existing)

    db.commit()
    return created_users


def seed_all_initial_data(db: Session) -> dict:
    """Master trigger function to populate initial seed state."""
    logger.info("Starting initial database seeding process...")
    
    categories = seed_categories(db)
    users = seed_users(db)

    logger.info("Database seeding completed successfully.")
    
    return {
        "categories_count": len(categories),
        "users_count": len(users)
    }