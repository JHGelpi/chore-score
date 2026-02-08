from pydantic import BaseModel, Field
from datetime import datetime, date
from typing import Optional


class CompletionBase(BaseModel):
    """Base completion schema with common attributes."""
    chore_id: int
    user_id: int
    week_start: date
    notes: Optional[str] = None


class CompletionCreate(BaseModel):
    """Schema for creating a new completion."""
    chore_id: int
    user_id: int
    week_start: Optional[date] = None
    completion_date: Optional[date] = None  # The specific date the chore was completed
    notes: Optional[str] = None


class CompletionUpdate(BaseModel):
    """Schema for updating an existing completion."""
    user_id: Optional[int] = None
    completed_at: Optional[datetime] = None
    week_start: Optional[date] = None
    notes: Optional[str] = None


class Completion(CompletionBase):
    """Schema for completion response."""
    id: int
    completed_at: datetime

    class Config:
        from_attributes = True
