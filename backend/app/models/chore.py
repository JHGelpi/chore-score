from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class Chore(Base):
    """Chore model for storing chore information."""

    __tablename__ = "chores"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)
    frequency = Column(String(20), default="weekly", nullable=False)  # daily, weekly, monthly
    day_of_week = Column(Integer, nullable=True)  # 0-6 for Monday-Sunday
    assigned_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    assigned_user = relationship("User", back_populates="chores")
    completions = relationship("Completion", back_populates="chore", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Chore(id={self.id}, name='{self.name}', frequency='{self.frequency}')>"
