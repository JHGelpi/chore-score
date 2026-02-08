"""
Chore API endpoints for managing chores in the application.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct
from typing import Optional
from datetime import date, datetime, time
from zoneinfo import ZoneInfo
from app.database import get_db
from app.models.chore import Chore
from app.models.completion import Completion
from app.models.user import User
from app.schemas.chore import ChoreCreate, ChoreUpdate, Chore as ChoreResponse, AdhocChoreCreate
from app.schemas.completion import Completion as CompletionResponse
from app.utils.helpers import get_week_start
from app.config import get_settings

settings = get_settings()

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
        if frequency not in ['daily', 'weekly', 'twice_weekly', 'monthly']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid frequency. Must be 'daily', 'weekly', 'twice_weekly', or 'monthly'"
            )
        query = query.filter(Chore.frequency == frequency)

    chores = query.offset(skip).limit(limit).all()
    return chores


@router.get("/weekly")
def get_weekly_chores(
    week_start: Optional[date] = Query(None, description="Start of the week (defaults to current week)"),
    user_id: Optional[int] = Query(None, description="Filter by assigned user"),
    frequency: Optional[str] = Query(None, description="Filter by frequency (daily, weekly, twice_weekly, monthly)"),
    db: Session = Depends(get_db)
):
    """
    Get chores for a specific week with completion status.

    - **week_start**: The Monday of the week to view (defaults to current week)
    - **user_id**: Filter chores by assigned user
    - **frequency**: Filter chores by frequency
    """
    if week_start is None:
        week_start = get_week_start()

    query = db.query(Chore).filter(Chore.is_active == True)

    if user_id:
        query = query.filter(Chore.assigned_user_id == user_id)

    if frequency:
        if frequency not in ['daily', 'weekly', 'twice_weekly', 'monthly']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid frequency. Must be 'daily', 'weekly', 'twice_weekly', or 'monthly'"
            )
        query = query.filter(Chore.frequency == frequency)

    chores = query.all()

    # Sort chores by frequency (daily, weekly, twice_weekly, monthly) then alphabetically by name
    frequency_order = {'daily': 1, 'weekly': 2, 'twice_weekly': 3, 'monthly': 4}
    chores = sorted(chores, key=lambda c: (frequency_order.get(c.frequency, 5), c.name.lower()))

    # Get completions for this week
    completions = db.query(Completion).filter(
        Completion.week_start == week_start
    ).all()

    # Build completion map (chore_id -> list of completions)
    from collections import defaultdict
    completion_map = defaultdict(list)
    for c in completions:
        completion_map[c.chore_id].append(c)

    # Get adhoc chores that have completions this week
    adhoc_chore_ids = [c.chore_id for c in completions if c.chore_id not in [ch.id for ch in chores]]
    if adhoc_chore_ids:
        adhoc_chores = db.query(Chore).filter(
            Chore.id.in_(adhoc_chore_ids),
            Chore.is_adhoc == True
        ).all()
        # Add adhoc chores to the list (will be sorted later)
        chores.extend(adhoc_chores)

    # Sort all chores (including adhoc) by name
    chores = sorted(chores, key=lambda c: c.name.lower())

    # Format response
    result = []
    for chore in chores:
        chore_completions = completion_map.get(chore.id, [])

        # Return completions as a list for this chore
        completions_data = []
        for completion in chore_completions:
            user = db.query(User).filter(User.id == completion.user_id).first()
            completions_data.append({
                "completed_at": completion.completed_at,
                "completed_by": completion.user_id,
                "completed_by_name": user.name if user else None,
                "notes": completion.notes,
                "completion_id": completion.id
            })

        result.append({
            "id": chore.id,
            "name": chore.name,
            "description": chore.description,
            "frequency": chore.frequency,
            "day_of_week": chore.day_of_week,
            "day_of_week_2": chore.day_of_week_2,
            "assigned_user_id": chore.assigned_user_id,
            "is_adhoc": chore.is_adhoc,  # Include adhoc flag
            "completions": completions_data  # Changed to list of completions
        })

    return {
        "week_start": week_start,
        "total_chores": len(result),
        "completed_chores": sum(len(c["completions"]) for c in result),
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


@router.get("/adhoc/names", response_model=list[str])
def get_adhoc_chore_names(db: Session = Depends(get_db)):
    """
    Get a list of unique adhoc chore names for autocomplete suggestions.

    Returns distinct chore names that have been used for adhoc chores.
    """
    # Query for distinct names of adhoc chores, ordered alphabetically
    adhoc_names = db.query(distinct(Chore.name)).filter(
        Chore.is_adhoc == True
    ).order_by(Chore.name).all()

    # Extract names from tuples
    return [name[0] for name in adhoc_names]


@router.post("/adhoc", response_model=CompletionResponse, status_code=status.HTTP_201_CREATED)
def create_adhoc_chore(adhoc_chore: AdhocChoreCreate, db: Session = Depends(get_db)):
    """
    Create an adhoc (one-off) chore and automatically mark it as complete.

    This endpoint creates a new chore with is_adhoc=True, is_active=False,
    and immediately creates a completion record for it. If a chore with the
    same name already exists as an adhoc chore, it reuses that chore instead
    of creating a duplicate.

    - **name**: Name of the adhoc chore
    - **description**: Optional description
    - **user_id**: ID of the user who completed the chore
    - **completion_date**: The date the chore was completed
    - **week_start**: The start of the week for tracking
    - **notes**: Optional completion notes
    """
    # Validate user exists
    user = db.query(User).filter(User.id == adhoc_chore.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {adhoc_chore.user_id} not found"
        )

    # Check if an adhoc chore with this name already exists
    existing_chore = db.query(Chore).filter(
        Chore.name == adhoc_chore.name,
        Chore.is_adhoc == True
    ).first()

    if existing_chore:
        # Reuse existing adhoc chore
        chore_id = existing_chore.id
    else:
        # Create new adhoc chore
        new_chore = Chore(
            name=adhoc_chore.name,
            description=adhoc_chore.description,
            frequency="weekly",  # Default frequency, not really used for adhoc
            is_active=False,  # Adhoc chores are not active recurring chores
            is_adhoc=True,
            assigned_user_id=None  # Adhoc chores aren't assigned to anyone
        )
        db.add(new_chore)
        db.flush()  # Flush to get the chore ID
        chore_id = new_chore.id

    # Create completion record
    # Use current timestamp (database will set this via server_default)
    tz = ZoneInfo(settings.timezone)
    now = datetime.now(tz)

    # Validate completion_date is not in the future
    if adhoc_chore.completion_date > now.date():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot complete a chore in the future"
        )

    # Check if this adhoc chore was already completed on this date
    existing_completion = db.query(Completion).filter(
        Completion.chore_id == chore_id,
        Completion.week_start == adhoc_chore.week_start,
        func.date(Completion.completed_at) == adhoc_chore.completion_date
    ).first()

    if existing_completion:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Adhoc chore '{adhoc_chore.name}' was already completed on {adhoc_chore.completion_date}"
        )

    # Create the completion (completed_at will be set by database default to current timestamp)
    db_completion = Completion(
        chore_id=chore_id,
        user_id=adhoc_chore.user_id,
        week_start=adhoc_chore.week_start,
        notes=adhoc_chore.notes
    )

    db.add(db_completion)
    db.commit()
    db.refresh(db_completion)

    return db_completion
