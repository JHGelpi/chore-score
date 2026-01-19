"""
Chore API endpoints for managing chores in the application.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date
from app.database import get_db
from app.models.chore import Chore
from app.models.completion import Completion
from app.schemas.chore import ChoreCreate, ChoreUpdate, Chore as ChoreResponse
from app.utils.helpers import get_week_start

router = APIRouter(prefix="/api/chores", tags=["chores"])


@router.get("", response_model=list[ChoreResponse])
def get_chores(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=100, description="Maximum number of records to return"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    assigned_user_id: Optional[int] = Query(None, description="Filter by assigned user"),
    frequency: Optional[str] = Query(None, description="Filter by frequency (daily, weekly, monthly)"),
    db: Session = Depends(get_db)
):
    """
    Get all chores with optional filtering.

    - **skip**: Number of chores to skip (for pagination)
    - **limit**: Maximum number of chores to return
    - **is_active**: Filter by active/inactive status
    - **assigned_user_id**: Filter by assigned user
    - **frequency**: Filter by frequency
    """
    query = db.query(Chore)

    if is_active is not None:
        query = query.filter(Chore.is_active == is_active)
    if assigned_user_id is not None:
        query = query.filter(Chore.assigned_user_id == assigned_user_id)
    if frequency:
        if frequency not in ['daily', 'weekly', 'monthly']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid frequency. Must be 'daily', 'weekly', or 'monthly'"
            )
        query = query.filter(Chore.frequency == frequency)

    chores = query.offset(skip).limit(limit).all()
    return chores


@router.get("/weekly")
def get_weekly_chores(
    week_start: Optional[date] = Query(None, description="Start of the week (defaults to current week)"),
    user_id: Optional[int] = Query(None, description="Filter by assigned user"),
    db: Session = Depends(get_db)
):
    """
    Get chores for a specific week with completion status.

    - **week_start**: The Monday of the week to view (defaults to current week)
    - **user_id**: Filter chores by assigned user
    """
    if week_start is None:
        week_start = get_week_start()

    query = db.query(Chore).filter(Chore.is_active == True)

    if user_id:
        query = query.filter(Chore.assigned_user_id == user_id)

    chores = query.all()

    # Get completions for this week
    completions = db.query(Completion).filter(
        Completion.week_start == week_start
    ).all()

    # Build completion map
    completion_map = {c.chore_id: c for c in completions}

    # Format response
    result = []
    for chore in chores:
        completion = completion_map.get(chore.id)
        result.append({
            "id": chore.id,
            "name": chore.name,
            "description": chore.description,
            "frequency": chore.frequency,
            "day_of_week": chore.day_of_week,
            "assigned_user_id": chore.assigned_user_id,
            "is_completed": completion is not None,
            "completed_at": completion.completed_at if completion else None,
            "completed_by": completion.user_id if completion else None,
            "completion_notes": completion.notes if completion else None
        })

    return {
        "week_start": week_start,
        "total_chores": len(result),
        "completed_chores": sum(1 for c in result if c["is_completed"]),
        "chores": result
    }


@router.get("/{chore_id}", response_model=ChoreResponse)
def get_chore(chore_id: int, db: Session = Depends(get_db)):
    """
    Get a specific chore by ID.

    - **chore_id**: The ID of the chore to retrieve
    """
    chore = db.query(Chore).filter(Chore.id == chore_id).first()
    if not chore:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chore with id {chore_id} not found"
        )
    return chore


@router.post("", response_model=ChoreResponse, status_code=status.HTTP_201_CREATED)
def create_chore(chore: ChoreCreate, db: Session = Depends(get_db)):
    """
    Create a new chore.

    - **name**: Chore name
    - **description**: Chore description (optional)
    - **frequency**: How often the chore needs to be done (daily, weekly, monthly)
    - **day_of_week**: Day of week for weekly chores (0=Monday, 6=Sunday)
    - **assigned_user_id**: ID of the user assigned to this chore (optional)
    - **is_active**: Whether the chore is active
    """
    # Validate assigned user if provided
    if chore.assigned_user_id:
        from app.models.user import User
        user = db.query(User).filter(User.id == chore.assigned_user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User with id {chore.assigned_user_id} not found"
            )

    db_chore = Chore(**chore.model_dump())
    db.add(db_chore)
    db.commit()
    db.refresh(db_chore)
    return db_chore


@router.put("/{chore_id}", response_model=ChoreResponse)
def update_chore(chore_id: int, chore: ChoreUpdate, db: Session = Depends(get_db)):
    """
    Update an existing chore.

    - **chore_id**: The ID of the chore to update
    - **name**: New name for the chore (optional)
    - **description**: New description (optional)
    - **frequency**: New frequency (optional)
    - **day_of_week**: New day of week (optional)
    - **assigned_user_id**: New assigned user (optional)
    - **is_active**: New active status (optional)
    """
    db_chore = db.query(Chore).filter(Chore.id == chore_id).first()
    if not db_chore:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chore with id {chore_id} not found"
        )

    # Validate assigned user if changing
    if chore.assigned_user_id is not None:
        from app.models.user import User
        user = db.query(User).filter(User.id == chore.assigned_user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User with id {chore.assigned_user_id} not found"
            )

    # Update fields
    for field, value in chore.model_dump(exclude_unset=True).items():
        setattr(db_chore, field, value)

    db.commit()
    db.refresh(db_chore)
    return db_chore


@router.delete("/{chore_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_chore(chore_id: int, db: Session = Depends(get_db)):
    """
    Delete a chore.

    - **chore_id**: The ID of the chore to delete

    Note: This will also delete all completion records for this chore.
    """
    db_chore = db.query(Chore).filter(Chore.id == chore_id).first()
    if not db_chore:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chore with id {chore_id} not found"
        )

    db.delete(db_chore)
    db.commit()
    return None
