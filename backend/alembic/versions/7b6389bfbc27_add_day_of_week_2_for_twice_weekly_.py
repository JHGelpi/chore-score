"""Add day_of_week_2 for twice weekly chores

Revision ID: 7b6389bfbc27
Revises: 287d4ac6d59a
Create Date: 2026-01-19 01:45:41.038577

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '7b6389bfbc27'
down_revision = '287d4ac6d59a'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add day_of_week_2 column to chores table
    op.add_column('chores', sa.Column('day_of_week_2', sa.Integer(), nullable=True))


def downgrade() -> None:
    # Remove day_of_week_2 column from chores table
    op.drop_column('chores', 'day_of_week_2')
