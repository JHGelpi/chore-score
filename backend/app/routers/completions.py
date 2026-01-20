"""
Completion API endpoints for tracking chore completions.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import date, datetime, time
from zoneinfo import ZoneInfo
from app.database import get_db
from app.models.completion import Completion
from app.models.chore import Chore
from app.models.user import User
from app.schemas.completion import CompletionCreate, Completion as CompletionResponse
from app.utils.helpers import get_week_start, get_current_week_start
from app.config import get_settings

settings = get_settings()

router = APIRouter(prefix="/api/completions", tags=["completions"])


@router.get("", response_model=list[CompletionResponse])
def get_completions(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=100, description="Maximum number of records to return"),
    chore_id: Optional[int] = Query(None, description="Filter by chore ID"),
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    week_start: Optional[date] = Query(None, description="Filter by week start date"),
    db: Session = Depends(get_db)
):
    """
    Get completion records with optional filtering.

    - **skip**: Number of completions to skip (for pagination)
    - **limit**: Maximum number of completions to return
    - **chore_id**: Filter by chore
    - **user_id**: Filter by user who completed the chore
    - **week_start**: Filter by week start date
    """
    query = db.query(Completion)

    if chore_id is not None:
        query = query.filter(Completion.chore_id == chore_id)
    if user_id is not None:
        query = query.filter(Completion.user_id == user_id)
    if week_start is not None:
        query = query.filter(Completion.week_start == week_start)

    # Order by most recent first
    query = query.order_by(Completion.completed_at.desc())

    completions = query.offset(skip).limit(limit).all()
    return completions


@router.post("", response_model=CompletionResponse, status_code=status.HTTP_201_CREATED)
def mark_chore_complete(completion: CompletionCreate, db: Session = Depends(get_db)):
    """
    Mark a chore as completed.

    - **chore_id**: ID of the chore being completed
    - **user_id**: ID of the user who completed the chore
    - **week_start**: Week start date (optional, defaults to current week)
    - **notes**: Optional notes about the completion
    """
    # Validate chore exists
    chore = db.query(Chore).filter(Chore.id == completion.chore_id).first()
    if not chore:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chore with id {completion.chore_id} not found"
        )

    # Validate user exists
    user = db.query(User).filter(User.id == completion.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {completion.user_id} not found"
        )

    # Set week_start if not provided
    if completion.week_start is None:
        completion.week_start = get_current_week_start()

    # Check if this chore was already completed this week
    existing = db.query(Completion).filter(
        Completion.chore_id == completion.chore_id,
        Completion.week_start == completion.week_start
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Chore '{chore.name}' was already completed for the week of {completion.week_start}"
        )

    # Create completion record
    completion_data = completion.model_dump(exclude={'completion_date'})
    db_completion = Completion(**completion_data)

    # Set completed_at to the specific date if provided, otherwise use current time
    if completion.completion_date:
        # Convert date to datetime in Eastern timezone (use noon to be in middle of day)
        tz = ZoneInfo(settings.timezone)
        naive_dt = datetime.combine(completion.completion_date, time(hour=12))
        db_completion.completed_at = naive_dt.replace(tzinfo=tz)

    db.add(db_completion)
    db.commit()
    db.refresh(db_completion)
    return db_completion


@router.delete("/{completion_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_completion(completion_id: int, db: Session = Depends(get_db)):
    """
    Delete a completion record (unmark a chore as complete).

    - **completion_id**: The ID of the completion record to delete
    """
    db_completion = db.query(Completion).filter(Completion.id == completion_id).first()
    if not db_completion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Completion record with id {completion_id} not found"
        )

    db.delete(db_completion)
    db.commit()
    return None


@router.get("/stats")
def get_completion_stats(
    user_id: Optional[int] = Query(None, description="Filter stats by user"),
    db: Session = Depends(get_db)
):
    """
    Get completion statistics.

    - **user_id**: Filter statistics for a specific user (optional)
    """
    query = db.query(Completion)

    if user_id is not None:
        query = query.filter(Completion.user_id == user_id)

    # Total completions
    total_completions = query.count()

    # Completions this week
    current_week = get_current_week_start()
    completions_this_week = query.filter(Completion.week_start == current_week).count()

    # Get total active chores
    active_chores_query = db.query(Chore).filter(Chore.is_active == True)
    if user_id is not None:
        active_chores_query = active_chores_query.filter(Chore.assigned_user_id == user_id)
    total_active_chores = active_chores_query.count()

    # Calculate completion rate
    completion_rate = 0.0
    if total_active_chores > 0:
        completion_rate = (completions_this_week / total_active_chores) * 100

    # Top users (most completions all time)
    top_users_query = db.query(
        Completion.user_id,
        User.name,
        func.count(Completion.id).label('completion_count')
    ).join(User, Completion.user_id == User.id).group_by(
        Completion.user_id, User.name
    ).order_by(func.count(Completion.id).desc()).limit(5)

    top_users = [
        {
            "user_id": user_id,
            "name": name,
            "completion_count": count
        }
        for user_id, name, count in top_users_query.all()
    ]

    # Recent completions
    recent_completions = query.order_by(
        Completion.completed_at.desc()
    ).limit(10).all()

    recent_list = []
    for comp in recent_completions:
        chore = db.query(Chore).filter(Chore.id == comp.chore_id).first()
        user = db.query(User).filter(User.id == comp.user_id).first()
        recent_list.append({
            "id": comp.id,
            "chore_name": chore.name if chore else "Unknown",
            "user_name": user.name if user else "Unknown",
            "completed_at": comp.completed_at,
            "week_start": comp.week_start
        })

    return {
        "total_completions": total_completions,
        "completions_this_week": completions_this_week,
        "total_active_chores": total_active_chores,
        "completion_rate": round(completion_rate, 2),
        "top_users": top_users,
        "recent_completions": recent_list
    }
