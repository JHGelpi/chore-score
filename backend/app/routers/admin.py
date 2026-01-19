"""
Admin API endpoints for administrative functions.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from app.database import get_db
from app.models.user import User
from app.models.chore import Chore
from app.models.completion import Completion
from app.utils.helpers import get_current_week_start

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/stats/dashboard")
def get_dashboard_stats(db: Session = Depends(get_db)):
    """
    Get comprehensive dashboard statistics for admins.

    Returns overview of users, chores, and completions.
    """
    # User statistics
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    admin_users = db.query(User).filter(User.is_admin == True).count()

    # Chore statistics
    total_chores = db.query(Chore).count()
    active_chores = db.query(Chore).filter(Chore.is_active == True).count()

    # Chores by frequency
    daily_chores = db.query(Chore).filter(
        Chore.is_active == True,
        Chore.frequency == 'daily'
    ).count()

    weekly_chores = db.query(Chore).filter(
        Chore.is_active == True,
        Chore.frequency == 'weekly'
    ).count()

    monthly_chores = db.query(Chore).filter(
        Chore.is_active == True,
        Chore.frequency == 'monthly'
    ).count()

    # Unassigned chores
    unassigned_chores = db.query(Chore).filter(
        Chore.is_active == True,
        Chore.assigned_user_id == None
    ).count()

    # Completion statistics
    total_completions = db.query(Completion).count()

    # Completions this week
    current_week = get_current_week_start()
    completions_this_week = db.query(Completion).filter(
        Completion.week_start == current_week
    ).count()

    # Completions last week
    last_week = current_week - timedelta(days=7)
    completions_last_week = db.query(Completion).filter(
        Completion.week_start == last_week
    ).count()

    # Completion rate
    completion_rate = 0.0
    if active_chores > 0:
        completion_rate = (completions_this_week / active_chores) * 100

    # Most active users (this week)
    active_users_this_week = db.query(
        User.id,
        User.name,
        func.count(Completion.id).label('completions')
    ).join(
        Completion, User.id == Completion.user_id
    ).filter(
        Completion.week_start == current_week
    ).group_by(
        User.id, User.name
    ).order_by(
        func.count(Completion.id).desc()
    ).limit(5).all()

    most_active = [
        {
            "user_id": user_id,
            "name": name,
            "completions": count
        }
        for user_id, name, count in active_users_this_week
    ]

    # Most completed chores (all time)
    most_completed_chores = db.query(
        Chore.id,
        Chore.name,
        func.count(Completion.id).label('completion_count')
    ).join(
        Completion, Chore.id == Completion.chore_id
    ).group_by(
        Chore.id, Chore.name
    ).order_by(
        func.count(Completion.id).desc()
    ).limit(5).all()

    popular_chores = [
        {
            "chore_id": chore_id,
            "name": name,
            "completion_count": count
        }
        for chore_id, name, count in most_completed_chores
    ]

    # Least completed chores (active chores with no completions this week)
    active_chore_ids = [c.id for c in db.query(Chore.id).filter(Chore.is_active == True).all()]
    completed_chore_ids_this_week = [
        c.chore_id for c in db.query(Completion.chore_id).filter(
            Completion.week_start == current_week
        ).distinct().all()
    ]

    incomplete_chore_ids = list(set(active_chore_ids) - set(completed_chore_ids_this_week))
    incomplete_chores = db.query(Chore).filter(Chore.id.in_(incomplete_chore_ids)).limit(5).all()

    incomplete_list = [
        {
            "chore_id": chore.id,
            "name": chore.name,
            "assigned_user_id": chore.assigned_user_id,
            "frequency": chore.frequency
        }
        for chore in incomplete_chores
    ]

    return {
        "users": {
            "total": total_users,
            "active": active_users,
            "admins": admin_users
        },
        "chores": {
            "total": total_chores,
            "active": active_chores,
            "unassigned": unassigned_chores,
            "by_frequency": {
                "daily": daily_chores,
                "weekly": weekly_chores,
                "monthly": monthly_chores
            }
        },
        "completions": {
            "total": total_completions,
            "this_week": completions_this_week,
            "last_week": completions_last_week,
            "completion_rate": round(completion_rate, 2)
        },
        "insights": {
            "most_active_users": most_active,
            "most_completed_chores": popular_chores,
            "incomplete_chores_this_week": incomplete_list
        }
    }


@router.get("/health")
def admin_health_check(db: Session = Depends(get_db)):
    """
    Extended health check for admin monitoring.

    Checks database connectivity and basic system status.
    """
    try:
        # Test database connection
        db.execute("SELECT 1")

        # Get some basic counts
        user_count = db.query(User).count()
        chore_count = db.query(Chore).count()
        completion_count = db.query(Completion).count()

        return {
            "status": "healthy",
            "database": "connected",
            "timestamp": datetime.now().isoformat(),
            "counts": {
                "users": user_count,
                "chores": chore_count,
                "completions": completion_count
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Health check failed: {str(e)}"
        )
