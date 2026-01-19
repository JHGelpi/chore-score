# Weekly Chores App - Detailed Implementation Plan

## Table of Contents
1. [Architecture Decisions](#architecture-decisions)
2. [Phase 1: Project Setup](#phase-1-project-setup)
3. [Phase 2: Backend Development](#phase-2-backend-development)
4. [Phase 3: Frontend Development](#phase-3-frontend-development)
5. [Phase 4: Testing & Documentation](#phase-4-testing--documentation)
6. [Deployment Guide](#deployment-guide)

---

## Architecture Decisions

### Answers to Key Questions

1. **Default admin user**: Yes, create during initial setup with email from `.env`
2. **Chore assignment**: One user per chore (can be extended later)
3. **Week definition**: Monday = start of week (configurable)
4. **Time tracking**: Yes, store exact timestamp of completion
5. **Notifications**: Email notifications optional (SMTP settings in .env)
6. **Rotation**: Manual for MVP (automated rotation in v1.2)

### Technology Choices

**Backend Stack:**
- FastAPI 0.109+ (async support, automatic API docs)
- SQLAlchemy 2.0+ (ORM with async support)
- Alembic (database migrations)
- Pydantic v2 (data validation)
- Python 3.11+ (latest stable)

**Database:**
- PostgreSQL 15+ (ACID compliance, JSON support)
- Connection pooling via SQLAlchemy
- Indexes on foreign keys and date fields

**Frontend:**
- Vanilla JavaScript (ES6+, no framework overhead)
- CSS Grid & Flexbox (responsive layouts)
- Web Storage API (user session)
- Fetch API (async HTTP calls)

**DevOps:**
- Docker Compose (local development)
- Multi-stage builds (optimized images)
- Health checks for all services
- Volume persistence for database

---

## Phase 1: Project Setup ✅ COMPLETED

**Status**: All Phase 1 tasks completed successfully
**Completion Date**: January 18, 2026

### Accomplishments:
- ✅ Directory structure created
- ✅ Docker containers configured and running (Backend: 192.168.170.53:8001, DB: port 5433)
- ✅ Database models implemented (User, Chore, Completion)
- ✅ Pydantic schemas created
- ✅ Alembic migrations configured and initial migration applied
- ✅ Admin user created
- ✅ Basic FastAPI application running with health checks
- ✅ Frontend skeleton with basic HTML/CSS/JS

### Step 1.1: Directory Structure Creation

Create the complete project structure:

```bash
mkdir -p backend/app/{models,schemas,routers,utils}
mkdir -p backend/alembic/versions
mkdir -p backend/tests
mkdir -p frontend/{static/{css,js,images},templates}
touch backend/app/__init__.py
touch backend/app/models/__init__.py
touch backend/app/schemas/__init__.py
touch backend/app/routers/__init__.py
touch backend/app/utils/__init__.py
touch backend/tests/__init__.py
```

### Step 1.2: Docker Configuration

**File: `docker-compose.yml`**

```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    container_name: chores_db
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: chores_backend
    restart: unless-stopped
    environment:
      - DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}
      - SECRET_KEY=${SECRET_KEY}
      - DEBUG=${DEBUG}
      - DEFAULT_USER_EMAIL=${DEFAULT_USER_EMAIL}
    volumes:
      - ./backend:/app
      - ./frontend:/app/frontend
    ports:
      - "8000:8000"
    depends_on:
      db:
        condition: service_healthy
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

volumes:
  postgres_data:
```

**File: `backend/Dockerfile`**

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (for caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**File: `backend/requirements.txt`**

```txt
fastapi==0.109.0
uvicorn[standard]==0.27.0
sqlalchemy==2.0.25
alembic==1.13.1
psycopg2-binary==2.9.9
pydantic==2.5.3
pydantic-settings==2.1.0
python-multipart==0.0.6
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
pytest==7.4.4
pytest-asyncio==0.23.3
httpx==0.26.0
```

### Step 1.3: Configuration Setup

**File: `backend/app/config.py`**

```python
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    database_url: str
    
    # Application
    secret_key: str
    debug: bool = False
    default_user_email: str
    
    # Email (optional)
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from_email: str = ""
    smtp_tls: bool = True
    
    # Scheduler
    scheduler_enabled: bool = True
    
    # Week settings
    week_starts_on_monday: bool = True
    
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False
    )


@lru_cache()
def get_settings():
    return Settings()
```

### Step 1.4: Database Connection

**File: `backend/app/database.py`**

```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import get_settings

settings = get_settings()

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency for getting database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### Step 1.5: Database Models

**File: `backend/app/models/user.py`**

```python
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), nullable=True)
    is_admin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    chores = relationship("Chore", back_populates="assigned_user")
    completions = relationship("Completion", back_populates="user")
    
    def __repr__(self):
        return f"<User {self.name}>"
```

**File: `backend/app/models/chore.py`**

```python
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class Chore(Base):
    __tablename__ = "chores"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    frequency = Column(String(20), default="weekly")  # daily, weekly, monthly
    day_of_week = Column(Integer, nullable=True)  # 0=Monday, 6=Sunday
    assigned_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    assigned_user = relationship("User", back_populates="chores")
    completions = relationship("Completion", back_populates="chore", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Chore {self.name}>"
```

**File: `backend/app/models/completion.py`**

```python
from sqlalchemy import Column, Integer, Text, DateTime, Date, ForeignKey, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class Completion(Base):
    __tablename__ = "completions"
    
    id = Column(Integer, primary_key=True, index=True)
    chore_id = Column(Integer, ForeignKey("chores.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    completed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    week_start = Column(Date, nullable=False, index=True)
    notes = Column(Text, nullable=True)
    
    # Relationships
    chore = relationship("Chore", back_populates="completions")
    user = relationship("User", back_populates="completions")
    
    __table_args__ = (
        Index('idx_completions_week', 'week_start'),
        Index('idx_completions_chore', 'chore_id'),
        Index('idx_completions_user', 'user_id'),
    )
    
    def __repr__(self):
        return f"<Completion chore_id={self.chore_id} user_id={self.user_id}>"
```

**File: `backend/app/models/__init__.py`**

```python
from app.models.user import User
from app.models.chore import Chore
from app.models.completion import Completion

__all__ = ["User", "Chore", "Completion"]
```

### Step 1.6: Alembic Configuration

**File: `backend/alembic.ini`**

```ini
[alembic]
script_location = alembic
prepend_sys_path = .
version_path_separator = os

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console
qualname =

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
```

**File: `backend/alembic/env.py`**

```python
from logging.config import fileConfig
from sqlalchemy import engine_from_config
from sqlalchemy import pool
from alembic import context
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.database import Base
from app.models import User, Chore, Completion
from app.config import get_settings

# this is the Alembic Config object
config = context.config

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Set SQLAlchemy URL from environment
settings = get_settings()
config.set_main_option("sqlalchemy.url", settings.database_url)

# add your model's MetaData object here
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

### Step 1.7: Initial FastAPI Application

**File: `backend/app/main.py`**

```python
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings

settings = get_settings()

app = FastAPI(
    title="Weekly Chores App",
    description="A mobile-friendly weekly chores management system",
    version="1.0.0",
    debug=settings.debug
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory="frontend/static"), name="static")


@app.get("/")
async def root():
    return {"message": "Weekly Chores App API", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### Step 1.8: Create Initial Migration

```bash
# Initialize Alembic
docker-compose exec backend alembic init alembic

# Create initial migration
docker-compose exec backend alembic revision --autogenerate -m "Initial schema"

# Apply migration
docker-compose exec backend alembic upgrade head
```

### Step 1.9: Admin User Creation Utility

**File: `backend/app/utils/create_admin.py`**

```python
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app.models import User
from app.config import get_settings

settings = get_settings()


def create_admin_user():
    """Create the initial admin user"""
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Check if admin exists
        admin = db.query(User).filter(User.is_admin == True).first()
        if admin:
            print(f"Admin user already exists: {admin.name}")
            return
        
        # Create admin
        admin = User(
            name="Admin",
            email=settings.default_user_email,
            is_admin=True,
            is_active=True
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        print(f"Created admin user: {admin.name} ({admin.email})")
        
    except Exception as e:
        print(f"Error creating admin: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    create_admin_user()
```

---

## Phase 2: Backend Development

### Step 2.1: Pydantic Schemas

**File: `backend/app/schemas/user.py`**

```python
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional


class UserBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    is_admin: bool = False
    is_active: bool = True


class UserCreate(UserBase):
    pass


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    is_admin: Optional[bool] = None
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class UserList(BaseModel):
    users: list[UserResponse]
    total: int
```

**File: `backend/app/schemas/chore.py`**

```python
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class ChoreBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    frequency: str = Field(default="weekly", pattern="^(daily|weekly|monthly)$")
    day_of_week: Optional[int] = Field(None, ge=0, le=6)
    assigned_user_id: Optional[int] = None
    is_active: bool = True


class ChoreCreate(ChoreBase):
    pass


class ChoreUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    frequency: Optional[str] = Field(None, pattern="^(daily|weekly|monthly)$")
    day_of_week: Optional[int] = Field(None, ge=0, le=6)
    assigned_user_id: Optional[int] = None
    is_active: Optional[bool] = None


class ChoreResponse(ChoreBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ChoreList(BaseModel):
    chores: list[ChoreResponse]
    total: int
```

**File: `backend/app/schemas/completion.py`**

```python
from pydantic import BaseModel, Field
from datetime import datetime, date
from typing import Optional


class CompletionBase(BaseModel):
    chore_id: int
    user_id: int
    notes: Optional[str] = None


class CompletionCreate(CompletionBase):
    week_start: Optional[date] = None


class CompletionResponse(CompletionBase):
    id: int
    completed_at: datetime
    week_start: date
    
    class Config:
        from_attributes = True


class CompletionList(BaseModel):
    completions: list[CompletionResponse]
    total: int


class CompletionStats(BaseModel):
    total_completions: int
    completions_this_week: int
    completion_rate: float
    top_users: list[dict]
```

### Step 2.2: API Routers

**File: `backend/app/routers/users.py`**

```python
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import User
from app.schemas.user import UserCreate, UserUpdate, UserResponse, UserList

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=UserList)
def get_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Get all users with optional filtering"""
    query = db.query(User)
    
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    
    total = query.count()
    users = query.offset(skip).limit(limit).all()
    
    return UserList(users=users, total=total)


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    """Get a specific user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("", response_model=UserResponse, status_code=201)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    """Create a new user"""
    # Check if user name already exists
    existing = db.query(User).filter(User.name == user.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="User name already exists")
    
    db_user = User(**user.model_dump())
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.put("/{user_id}", response_model=UserResponse)
def update_user(user_id: int, user: UserUpdate, db: Session = Depends(get_db)):
    """Update a user"""
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check name uniqueness if changing name
    if user.name and user.name != db_user.name:
        existing = db.query(User).filter(User.name == user.name).first()
        if existing:
            raise HTTPException(status_code=400, detail="User name already exists")
    
    for field, value in user.model_dump(exclude_unset=True).items():
        setattr(db_user, field, value)
    
    db.commit()
    db.refresh(db_user)
    return db_user


@router.delete("/{user_id}", status_code=204)
def delete_user(user_id: int, db: Session = Depends(get_db)):
    """Delete a user"""
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if db_user.is_admin:
        # Check if this is the last admin
        admin_count = db.query(User).filter(User.is_admin == True).count()
        if admin_count <= 1:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete the last admin user"
            )
    
    db.delete(db_user)
    db.commit()
    return None
```

**File: `backend/app/routers/chores.py`**

```python
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date, timedelta
from app.database import get_db
from app.models import Chore, Completion
from app.schemas.chore import ChoreCreate, ChoreUpdate, ChoreResponse, ChoreList

router = APIRouter(prefix="/api/chores", tags=["chores"])


def get_week_start(target_date: date = None) -> date:
    """Get the start of the week (Monday)"""
    if target_date is None:
        target_date = date.today()
    return target_date - timedelta(days=target_date.weekday())


@router.get("", response_model=ChoreList)
def get_chores(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    is_active: Optional[bool] = None,
    assigned_user_id: Optional[int] = None,
    frequency: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all chores with optional filtering"""
    query = db.query(Chore)
    
    if is_active is not None:
        query = query.filter(Chore.is_active == is_active)
    if assigned_user_id is not None:
        query = query.filter(Chore.assigned_user_id == assigned_user_id)
    if frequency:
        query = query.filter(Chore.frequency == frequency)
    
    total = query.count()
    chores = query.offset(skip).limit(limit).all()
    
    return ChoreList(chores=chores, total=total)


@router.get("/weekly")
def get_weekly_chores(
    week_start: Optional[date] = None,
    user_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get chores for a specific week with completion status"""
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
            "day_of_week": chore.day_of_week,
            "assigned_user_id": chore.assigned_user_id,
            "is_completed": completion is not None,
            "completed_at": completion.completed_at if completion else None,
            "completed_by": completion.user_id if completion else None
        })
    
    return {
        "week_start": week_start,
        "chores": result
    }


@router.get("/{chore_id}", response_model=ChoreResponse)
def get_chore(chore_id: int, db: Session = Depends(get_db)):
    """Get a specific chore"""
    chore = db.query(Chore).filter(Chore.id == chore_id).first()
    if not chore:
        raise HTTPException(status_code=404, detail="Chore not found")
    return chore


@router.post("", response_model=ChoreResponse, status_code=201)
def create_chore(chore: ChoreCreate, db: Session = Depends(get_db)):
    """Create a new chore"""
    db_chore = Chore(**chore.model_dump())
    db.add(db_chore)
    db.commit()
    db.refresh(db_chore)
    return db_chore


@router.put("/{chore_id}", response_model=ChoreResponse)
def update_chore(chore_id: int, chore: ChoreUpdate, db: Session = Depends(get_db)):
    """Update a chore"""
    db_chore = db.query(Chore).filter(Chore.id == chore_id).first()
    if not db_chore:
        raise HTTPException(status_code=404, detail="Chore not found")
    
    for field, value in chore.model_dump(exclude_unset=True).items():
        setattr(db_chore, field, value)
    
    db.commit()
    db.refresh(db_chore)
    return db_chore


@router.delete("/{chore_id}", status_code=204)
def delete_chore(chore_id: int, db: Session = Depends(get_db)):
    """Delete a chore"""
    db_chore = db.query(Chore).filter(Chore.id == chore_id).first()
    if not db_chore:
        raise HTTPException(status_code=404, detail="Chore not found")
    
    db.delete(db_chore)
    db.commit()
    return None
```

*Continued in next section...*

---

## Phase 3: Frontend Development

### Step 3.1: Base CSS Framework

**File: `frontend/static/css/styles.css`**

```css
/* Reset and Base Styles */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

:root {
    /* Color Palette */
    --primary: #4A90E2;
    --primary-dark: #357ABD;
    --success: #7ED321;
    --warning: #F5A623;
    --danger: #D0021B;
    --background: #F8F9FA;
    --surface: #FFFFFF;
    --text: #333333;
    --text-light: #6C757D;
    --border: #DEE2E6;
    
    /* Spacing */
    --spacing-xs: 0.25rem;
    --spacing-sm: 0.5rem;
    --spacing-md: 1rem;
    --spacing-lg: 1.5rem;
    --spacing-xl: 2rem;
    
    /* Typography */
    --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    --font-size-sm: 0.875rem;
    --font-size-base: 1rem;
    --font-size-lg: 1.125rem;
    --font-size-xl: 1.5rem;
    
    /* Shadows */
    --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
    --shadow-md: 0 4px 6px rgba(0,0,0,0.1);
    --shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
    
    /* Border Radius */
    --radius-sm: 0.25rem;
    --radius-md: 0.5rem;
    --radius-lg: 1rem;
    
    /* Transitions */
    --transition: all 0.2s ease-in-out;
}

body {
    font-family: var(--font-family);
    font-size: var(--font-size-base);
    color: var(--text);
    background-color: var(--background);
    line-height: 1.6;
}

/* Container */
.container {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--spacing-md);
}

/* Header */
.header {
    background-color: var(--primary);
    color: white;
    padding: var(--spacing-md);
    box-shadow: var(--shadow-md);
}

.header h1 {
    font-size: var(--font-size-xl);
    margin-bottom: var(--spacing-xs);
}

/* Navigation */
.nav {
    display: flex;
    gap: var(--spacing-md);
    margin-top: var(--spacing-md);
}

.nav-link {
    color: white;
    text-decoration: none;
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius-sm);
    transition: var(--transition);
}

.nav-link:hover,
.nav-link.active {
    background-color: var(--primary-dark);
}

/* Buttons */
.btn {
    display: inline-block;
    padding: var(--spacing-sm) var(--spacing-lg);
    font-size: var(--font-size-base);
    font-weight: 500;
    text-align: center;
    text-decoration: none;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: var(--transition);
    min-height: 44px;
    min-width: 44px;
}

.btn-primary {
    background-color: var(--primary);
    color: white;
}

.btn-primary:hover {
    background-color: var(--primary-dark);
}

.btn-success {
    background-color: var(--success);
    color: white;
}

.btn-danger {
    background-color: var(--danger);
    color: white;
}

/* Cards */
.card {
    background-color: var(--surface);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
    padding: var(--spacing-lg);
    margin-bottom: var(--spacing-md);
}

/* Grid Layout */
.grid {
    display: grid;
    gap: var(--spacing-md);
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
}

/* Weekly View */
.weekly-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: var(--spacing-sm);
    margin: var(--spacing-lg) 0;
}

.day-column {
    background-color: var(--surface);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
}

.day-header {
    font-weight: 600;
    margin-bottom: var(--spacing-md);
    padding-bottom: var(--spacing-sm);
    border-bottom: 2px solid var(--border);
}

.chore-item {
    background-color: var(--background);
    padding: var(--spacing-md);
    border-radius: var(--radius-sm);
    margin-bottom: var(--spacing-sm);
    cursor: pointer;
    transition: var(--transition);
}

.chore-item:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
}

.chore-item.completed {
    background-color: var(--success);
    color: white;
}

/* Forms */
.form-group {
    margin-bottom: var(--spacing-md);
}

.form-label {
    display: block;
    margin-bottom: var(--spacing-xs);
    font-weight: 500;
}

.form-input,
.form-select,
.form-textarea {
    width: 100%;
    padding: var(--spacing-sm) var(--spacing-md);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-base);
    min-height: 44px;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
}

/* Mobile Responsive */
@media (max-width: 768px) {
    .weekly-grid {
        grid-template-columns: 1fr;
    }
    
    .container {
        padding: var(--spacing-sm);
    }
    
    .grid {
        grid-template-columns: 1fr;
    }
}
```

### Step 3.2: JavaScript API Client

**File: `frontend/static/js/api.js`**

```javascript
const API_BASE = '/api';

class APIClient {
    async request(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };
        
        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Request failed');
            }
            
            if (response.status === 204) {
                return null;
            }
            
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }
    
    // Users
    async getUsers() {
        return this.request('/users');
    }
    
    async createUser(userData) {
        return this.request('/users', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }
    
    async updateUser(userId, userData) {
        return this.request(`/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
    }
    
    async deleteUser(userId) {
        return this.request(`/users/${userId}`, {
            method: 'DELETE'
        });
    }
    
    // Chores
    async getChores(filters = {}) {
        const params = new URLSearchParams(filters);
        return this.request(`/chores?${params}`);
    }
    
    async getWeeklyChores(weekStart = null, userId = null) {
        const params = new URLSearchParams();
        if (weekStart) params.append('week_start', weekStart);
        if (userId) params.append('user_id', userId);
        return this.request(`/chores/weekly?${params}`);
    }
    
    async createChore(choreData) {
        return this.request('/chores', {
            method: 'POST',
            body: JSON.stringify(choreData)
        });
    }
    
    async updateChore(choreId, choreData) {
        return this.request(`/chores/${choreId}`, {
            method: 'PUT',
            body: JSON.stringify(choreData)
        });
    }
    
    async deleteChore(choreId) {
        return this.request(`/chores/${choreId}`, {
            method: 'DELETE'
        });
    }
    
    // Completions
    async markComplete(completionData) {
        return this.request('/completions', {
            method: 'POST',
            body: JSON.stringify(completionData)
        });
    }
    
    async getCompletions(filters = {}) {
        const params = new URLSearchParams(filters);
        return this.request(`/completions?${params}`);
    }
    
    async getCompletionStats() {
        return this.request('/completions/stats');
    }
}

const api = new APIClient();
```

---

## Phase 4: Testing & Documentation

### Testing Strategy

**File: `backend/tests/test_users.py`**

```python
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app.models import User

client = TestClient(app)


@pytest.fixture(scope="function")
def db():
    Base.metadata.create_all(bind=engine)
    yield SessionLocal()
    Base.metadata.drop_all(bind=engine)


def test_create_user(db):
    response = client.post(
        "/api/users",
        json={"name": "Test User", "email": "test@example.com"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test User"
    assert data["email"] == "test@example.com"


def test_get_users(db):
    # Create test user
    db_user = User(name="Test", email="test@test.com")
    db.add(db_user)
    db.commit()
    
    response = client.get("/api/users")
    assert response.status_code == 200
    data = response.json()
    assert len(data["users"]) > 0
```

---

## Deployment Guide

### Production Deployment

1. **Environment Setup**
```bash
# Set production environment variables
export DEBUG=False
export SECRET_KEY=$(openssl rand -hex 32)
```

2. **Database Backup**
```bash
# Backup script
docker exec chores_db pg_dump -U pooluser pooldb > backup.sql
```

3. **Nginx Configuration** (optional reverse proxy)
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Next Steps

1. Start with Phase 1 implementation
2. Test each component as you build
3. Document any deviations from the plan
4. Commit frequently with clear messages
5. Update ROADMAP.md as phases complete

This implementation plan provides detailed guidance for each phase of development. Use CLAUDE.md alongside this document for reference.
