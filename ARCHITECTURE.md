# Architecture Documentation

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         User Device                          │
│                    (Browser / Mobile)                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ HTTP/HTTPS
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                      Frontend Layer                          │
│  ┌────────────────────────────────────────────────────┐    │
│  │  HTML Templates (Jinja2)                           │    │
│  │  - index.html (user selection)                     │    │
│  │  - weekly.html (weekly view)                       │    │
│  │  - admin.html (admin console)                      │    │
│  └────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Static Assets                                      │    │
│  │  - styles.css (mobile-first responsive)            │    │
│  │  - main.js, admin.js, weekly.js                    │    │
│  │  - api.js (API client wrapper)                     │    │
│  └────────────────────────────────────────────────────┘    │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ REST API (JSON)
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    FastAPI Backend                           │
│  ┌────────────────────────────────────────────────────┐    │
│  │  API Routers                                        │    │
│  │  - users.py      (user CRUD)                        │    │
│  │  - chores.py     (chore CRUD + weekly view)        │    │
│  │  - completions.py (marking complete, history)      │    │
│  │  - admin.py      (admin operations)                │    │
│  └────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Business Logic / Services                          │    │
│  │  - Input validation (Pydantic)                      │    │
│  │  - Authorization checks                             │    │
│  │  - Week calculation utilities                       │    │
│  └────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Database Layer (SQLAlchemy ORM)                    │    │
│  │  - models/user.py                                   │    │
│  │  - models/chore.py                                  │    │
│  │  - models/completion.py                             │    │
│  └────────────────────────────────────────────────────┘    │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ SQL Queries
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                   PostgreSQL Database                        │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Tables                                             │    │
│  │  - users (id, name, email, is_admin, ...)          │    │
│  │  - chores (id, name, description, frequency, ...)  │    │
│  │  - completions (id, chore_id, user_id, ...)        │    │
│  └────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Indexes                                            │    │
│  │  - idx_completions_week                             │    │
│  │  - idx_completions_chore                            │    │
│  │  - idx_completions_user                             │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow Diagrams

### 1. User Marks Chore Complete

```
User (Mobile)
    │
    │ 1. Tap chore card
    ▼
Frontend (weekly.js)
    │
    │ 2. POST /api/completions
    │    { chore_id, user_id, week_start }
    ▼
FastAPI Router (completions.py)
    │
    │ 3. Validate request (Pydantic)
    ▼
Business Logic
    │
    │ 4. Check chore exists
    │ 5. Check not already completed
    ▼
Database (SQLAlchemy)
    │
    │ 6. INSERT INTO completions
    │ 7. COMMIT transaction
    ▼
Response
    │
    │ 8. Return completion object
    ▼
Frontend
    │
    │ 9. Update UI (mark green)
    │ 10. Show success message
    ▼
User sees updated view
```

### 2. Weekly View Load

```
User navigates to weekly view
    │
    ▼
Frontend requests data
    │
    │ GET /api/chores/weekly?week_start=2024-01-15
    ▼
Backend processes request
    │
    ├─► Query active chores
    │   (WHERE is_active = true)
    │
    └─► Query completions for week
        (WHERE week_start = '2024-01-15')
    │
    ▼
Join and format data
    │
    │ For each chore:
    │ - Basic chore info
    │ - Completion status (true/false)
    │ - Completed by (user_id)
    │ - Completed at (timestamp)
    ▼
Return JSON response
    │
    ▼
Frontend renders weekly grid
    │
    ├─► Create columns for each day
    ├─► Place chores in correct day
    ├─► Apply completion styling
    └─► Enable tap-to-complete
    │
    ▼
User sees interactive weekly view
```

### 3. Admin Adds New Chore

```
Admin Console
    │
    │ 1. Fill out form
    │    - Name, Description
    │    - Frequency, Day of Week
    │    - Assigned User
    ▼
Form Validation (Frontend)
    │
    │ 2. Check required fields
    │ 3. Validate day_of_week (0-6)
    ▼
API Request
    │
    │ 4. POST /api/chores
    ▼
FastAPI Router (chores.py)
    │
    │ 5. Pydantic validation
    │ 6. Check assigned user exists
    ▼
Database Insert
    │
    │ 7. INSERT INTO chores
    │ 8. COMMIT
    ▼
Response & UI Update
    │
    │ 9. Return new chore object
    │ 10. Refresh chore list
    │ 11. Show success message
    ▼
Admin sees new chore in list
```

## Database Schema Relationships

```
┌─────────────────────┐
│       Users         │
│─────────────────────│
│ PK  id              │
│     name (UNIQUE)   │
│     email           │
│     is_admin        │
│     is_active       │
│     created_at      │
│     updated_at      │
└──────────┬──────────┘
           │
           │ 1:N
           │
    ┌──────▼──────────────────┐
    │                         │
┌───▼────────────────┐   ┌───▼──────────────┐
│      Chores        │   │   Completions    │
│────────────────────│   │──────────────────│
│ PK  id             │   │ PK  id           │
│     name           │   │ FK  user_id ─────┘
│     description    │   │ FK  chore_id
│     frequency      │   │     completed_at
│     day_of_week    │   │     week_start
│ FK  assigned_user  │   │     notes
│     is_active      │   └──────────────────┘
│     created_at     │           │
│     updated_at     │           │ N:1
└────────┬───────────┘           │
         │                       │
         │ 1:N                   │
         │                       │
         └───────────────────────┘
```

## Component Architecture

### Backend Components

```
app/
├── main.py                 # FastAPI app initialization
│   ├── CORS middleware
│   ├── Static files mount
│   └── Router registration
│
├── config.py              # Configuration management
│   ├── Environment variables
│   ├── Database URL
│   └── Application settings
│
├── database.py            # Database connection
│   ├── SQLAlchemy engine
│   ├── Session factory
│   └── Base model class
│
├── models/                # ORM models
│   ├── user.py
│   ├── chore.py
│   └── completion.py
│
├── schemas/               # Pydantic models
│   ├── user.py           # UserCreate, UserUpdate, UserResponse
│   ├── chore.py          # ChoreCreate, ChoreUpdate, ChoreResponse
│   └── completion.py     # CompletionCreate, CompletionResponse
│
├── routers/              # API endpoints
│   ├── users.py          # User CRUD operations
│   ├── chores.py         # Chore CRUD + weekly view
│   ├── completions.py    # Completion tracking
│   └── admin.py          # Admin operations
│
└── utils/                # Helper functions
    ├── create_admin.py   # Admin user creation
    └── helpers.py        # Utility functions
```

### Frontend Components

```
frontend/
├── templates/             # HTML pages
│   ├── index.html        # User selection
│   ├── weekly.html       # Weekly chore view
│   ├── admin.html        # Admin console
│   └── history.html      # Completion history
│
└── static/
    ├── css/
    │   └── styles.css    # Mobile-first responsive CSS
    │
    └── js/
        ├── api.js        # API client wrapper
        ├── main.js       # Common utilities
        ├── weekly.js     # Weekly view logic
        └── admin.js      # Admin console logic
```

## Security Architecture

### Authentication Flow

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       │ 1. User selects name
       │
       ▼
┌─────────────────────┐
│  localStorage       │
│  { userId: 123 }    │
└──────┬──────────────┘
       │
       │ 2. Included in API calls
       │
       ▼
┌─────────────────────┐
│  FastAPI Backend    │
│  - Validate user_id │
│  - Check user exists│
│  - Check is_active  │
└──────┬──────────────┘
       │
       │ 3. Process request
       │
       ▼
┌─────────────────────┐
│   Database          │
└─────────────────────┘
```

### Admin Authorization

```
Request to admin endpoint
    │
    ▼
Check Authorization header
    │
    ├─► Missing → 401 Unauthorized
    │
    ▼
Verify admin credentials
    │
    ├─► Invalid → 401 Unauthorized
    │
    ▼
Check user.is_admin = true
    │
    ├─► False → 403 Forbidden
    │
    ▼
Process admin request
```

## Scalability Considerations

### Current Architecture (MVP)
- Single server deployment
- ~100 concurrent users
- ~1000 chores/completions per day
- Basic caching in browser

### Future Scaling Options

```
┌─────────────────────────────────────────────┐
│            Load Balancer (Nginx)            │
└────────┬──────────────┬─────────────────────┘
         │              │
    ┌────▼────┐    ┌────▼────┐
    │ FastAPI │    │ FastAPI │
    │ Server  │    │ Server  │
    │   #1    │    │   #2    │
    └────┬────┘    └────┬────┘
         │              │
         └──────┬───────┘
                │
         ┌──────▼──────┐
         │  PostgreSQL │
         │  (Primary)  │
         └──────┬──────┘
                │
         ┌──────▼──────┐
         │  PostgreSQL │
         │  (Replica)  │
         └─────────────┘
```

### Caching Strategy (Future)

```
Request → FastAPI
    │
    ├─► Check Redis cache
    │   ├─► Hit → Return cached data
    │   └─► Miss ↓
    │
    └─► Query PostgreSQL
        │
        └─► Store in Redis
            │
            └─► Return data
```

## Monitoring & Observability

### Health Checks

```
GET /health
    │
    ├─► API Status: OK/ERROR
    │
    ├─► Database Connection: OK/ERROR
    │   └─► SELECT 1 FROM users LIMIT 1
    │
    └─► Return status code
        ├─► 200 OK (all healthy)
        └─► 503 Service Unavailable
```

### Logging Strategy

```
Application Logs
    │
    ├─► Access Logs (uvicorn)
    │   - Request method, path
    │   - Response status, time
    │
    ├─► Application Logs (Python logging)
    │   - INFO: Normal operations
    │   - WARNING: Potential issues
    │   - ERROR: Failures
    │
    └─► Database Logs (PostgreSQL)
        - Slow queries (>1s)
        - Connection errors
```

## Deployment Architecture

### Docker Compose (Development/Small Scale)

```
┌──────────────────────────────────┐
│         Docker Host              │
│                                  │
│  ┌────────────────────────────┐ │
│  │  chores_backend            │ │
│  │  - FastAPI app             │ │
│  │  - Port: 8000              │ │
│  │  - Volume: ./backend       │ │
│  └────────────┬───────────────┘ │
│               │                  │
│  ┌────────────▼───────────────┐ │
│  │  chores_db                 │ │
│  │  - PostgreSQL 15           │ │
│  │  - Port: 5432              │ │
│  │  - Volume: postgres_data   │ │
│  └────────────────────────────┘ │
└──────────────────────────────────┘
```

### Production Deployment (Example)

```
Internet
    │
    ▼
Reverse Proxy (Nginx/Caddy)
    │ - HTTPS termination
    │ - Rate limiting
    │ - Static file serving
    ▼
FastAPI Backend (Docker)
    │ - Gunicorn + Uvicorn workers
    │ - Multiple instances
    ▼
PostgreSQL (Managed/Self-hosted)
    │ - Automated backups
    │ - Connection pooling
    │ - Read replicas
    ▼
Persistent Storage
```

## Technology Decisions Rationale

### Why FastAPI?
- ✅ Automatic API documentation (Swagger/OpenAPI)
- ✅ High performance (async support)
- ✅ Modern Python features (type hints)
- ✅ Built-in validation (Pydantic)
- ✅ Easy to learn and use

### Why PostgreSQL?
- ✅ ACID compliance (data integrity)
- ✅ JSON support (flexible data)
- ✅ Excellent performance
- ✅ Rich ecosystem
- ✅ Open source

### Why Vanilla JavaScript?
- ✅ No framework overhead
- ✅ Fast page loads
- ✅ Easy to understand
- ✅ No build process needed
- ✅ Works everywhere

### Why Docker?
- ✅ Consistent environments
- ✅ Easy deployment
- ✅ Isolated dependencies
- ✅ Scalable architecture
- ✅ Simple local development

## Performance Characteristics

### Expected Response Times (MVP)
- User login: < 100ms
- Load weekly view: < 200ms
- Mark chore complete: < 150ms
- Admin operations: < 300ms

### Database Query Optimization
- Indexed foreign keys
- Indexed date fields (week_start)
- Query pagination for lists
- Eager loading of relationships

### Frontend Optimization
- Minimize HTTP requests
- Cache static assets
- Lazy load images
- Progressive enhancement

## Maintenance & Operations

### Backup Strategy
```bash
# Daily automated backup
0 2 * * * docker exec chores_db pg_dump -U pooluser pooldb > /backups/chores_$(date +\%Y\%m\%d).sql

# Keep 30 days of backups
find /backups -name "chores_*.sql" -mtime +30 -delete
```

### Update Strategy
1. Pull latest code
2. Run database migrations
3. Restart containers
4. Verify health checks
5. Monitor logs

### Monitoring Checklist
- [ ] API response times
- [ ] Database connection pool
- [ ] Disk space usage
- [ ] Memory usage
- [ ] Error rates
- [ ] User activity
