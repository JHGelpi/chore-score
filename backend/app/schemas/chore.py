from pydantic import BaseModel, Field
from datetime import datetime, date
from typing import Optional


class ChoreBase(BaseModel):
    """Base chore schema with common attributes."""
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    frequency: str = Field(default="weekly", pattern="^(daily|weekly|twice_weekly|monthly)$")
    day_of_week: Optional[int] = Field(None, ge=0, le=6)  # 0-6 for Monday-Sunday
    day_of_week_2: Optional[int] = Field(None, ge=0, le=6)  # Second day for twice_weekly
    assigned_user_id: Optional[int] = None
    is_active: bool = True
    is_adhoc: bool = False


class ChoreCreate(ChoreBase):
    """Schema for creating a new chore."""
    pass


class ChoreUpdate(BaseModel):
    """Schema for updating a chore."""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    frequency: Optional[str] = Field(None, pattern="^(daily|weekly|twice_weekly|monthly)$")
    day_of_week: Optional[int] = Field(None, ge=0, le=6)
    day_of_week_2: Optional[int] = Field(None, ge=0, le=6)
    assigned_user_id: Optional[int] = None
    is_active: Optional[bool] = None
    is_adhoc: Optional[bool] = None


class Chore(ChoreBase):
    """Schema for chore response."""
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AdhocChoreCreate(BaseModel):
    """Schema for creating an adhoc chore with automatic completion."""
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    user_id: int
    completion_date: date
    week_start: date
    notes: Optional[str] = None
