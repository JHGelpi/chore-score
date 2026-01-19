"""
User API endpoints for managing users in the chores application.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate, User as UserResponse

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=list[UserResponse])
def get_users(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=100, description="Maximum number of records to return"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    db: Session = Depends(get_db)
):
    """
    Get all users with optional filtering.

    - **skip**: Number of users to skip (for pagination)
    - **limit**: Maximum number of users to return
    - **is_active**: Filter by active/inactive status
    """
    query = db.query(User)

    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    users = query.offset(skip).limit(limit).all()
    return users


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    """
    Get a specific user by ID.

    - **user_id**: The ID of the user to retrieve
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found"
        )
    return user


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    """
    Create a new user.

    - **name**: User's name (must be unique)
    - **email**: User's email (optional)
    - **is_admin**: Whether the user has admin privileges
    - **is_active**: Whether the user is active
    """
    # Check if user name already exists
    existing = db.query(User).filter(User.name == user.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with name '{user.name}' already exists"
        )

    # Check if email already exists (if provided)
    if user.email:
        existing_email = db.query(User).filter(User.email == user.email).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User with email '{user.email}' already exists"
            )

    db_user = User(**user.model_dump())
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.put("/{user_id}", response_model=UserResponse)
def update_user(user_id: int, user: UserUpdate, db: Session = Depends(get_db)):
    """
    Update an existing user.

    - **user_id**: The ID of the user to update
    - **name**: New name for the user (optional)
    - **email**: New email for the user (optional)
    - **is_admin**: New admin status (optional)
    - **is_active**: New active status (optional)
    """
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found"
        )

    # Check name uniqueness if changing name
    if user.name and user.name != db_user.name:
        existing = db.query(User).filter(User.name == user.name).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User with name '{user.name}' already exists"
            )

    # Check email uniqueness if changing email
    if user.email and user.email != db_user.email:
        existing_email = db.query(User).filter(User.email == user.email).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User with email '{user.email}' already exists"
            )

    # Update fields
    for field, value in user.model_dump(exclude_unset=True).items():
        setattr(db_user, field, value)

    db.commit()
    db.refresh(db_user)
    return db_user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, db: Session = Depends(get_db)):
    """
    Delete a user.

    - **user_id**: The ID of the user to delete

    Note: Cannot delete the last admin user.
    """
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found"
        )

    # Prevent deletion of the last admin
    if db_user.is_admin:
        admin_count = db.query(User).filter(User.is_admin == True).count()
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete the last admin user"
            )

    db.delete(db_user)
    db.commit()
    return None
