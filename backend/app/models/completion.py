from sqlalchemy import Column, Integer, Text, DateTime, Date, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class Completion(Base):
    """Completion model for tracking chore completions."""

    __tablename__ = "completions"

    id = Column(Integer, primary_key=True, index=True)
    chore_id = Column(Integer, ForeignKey("chores.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    completed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    week_start = Column(Date, nullable=False, index=True)
    notes = Column(Text, nullable=True)

    # Relationships
    chore = relationship("Chore", back_populates="completions")
    user = relationship("User", back_populates="completions")

    def __repr__(self):
        return f"<Completion(id={self.id}, chore_id={self.chore_id}, user_id={self.user_id}, week_start={self.week_start})>"


# Create indexes for better query performance
Index("idx_completions_week", Completion.week_start)
Index("idx_completions_chore", Completion.chore_id)
Index("idx_completions_user", Completion.user_id)
