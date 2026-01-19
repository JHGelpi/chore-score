"""
Utility script to create the initial admin user.
Run with: python -m app.utils.create_admin
"""
import sys
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.models import User
from app.config import get_settings


def create_admin_user():
    """Create the initial admin user."""
    settings = get_settings()
    db: Session = SessionLocal()

    try:
        # Check if admin user already exists
        existing_admin = db.query(User).filter(User.email == settings.admin_email).first()

        if existing_admin:
            print(f"Admin user with email '{settings.admin_email}' already exists.")
            return

        # Create new admin user
        admin_user = User(
            name="Admin",
            email=settings.admin_email,
            is_admin=True,
            is_active=True
        )

        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

        print(f"Admin user created successfully!")
        print(f"  ID: {admin_user.id}")
        print(f"  Name: {admin_user.name}")
        print(f"  Email: {admin_user.email}")

    except Exception as e:
        print(f"Error creating admin user: {e}")
        db.rollback()
        sys.exit(1)

    finally:
        db.close()


if __name__ == "__main__":
    create_admin_user()
