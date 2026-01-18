# Weekly Chores Web App

## Project Overview

A mobile-friendly weekly chores management system built with Python, FastAPI, PostgreSQL, and Docker. This application allows families or housemates to track and manage weekly chores with an admin console for configuration and a clean, intuitive interface for users.

## Core Features

### 1. User Management
- **Simple Authentication**: Users select their name from a dropdown (no passwords required)
- **Admin Console**: Add, remove, and modify users
- **User Filtering**: View chores by specific users

### 2. Chore Management
- **CRUD Operations**: Admin can create, read, update, and delete chores
- **Weekly View**: Primary interface shows a week-at-a-glance table
- **Chore Details**: Name, description, assigned user(s), frequency
- **Filtering**: Filter chores by name, user, or status

### 3. History & Tracking
- **Completion Tracking**: Record who completed each chore and when
- **Historical Data**: Retain all completion records
- **Analytics**: View completion rates and patterns

### 4. Mobile-First Design
- **Responsive UI**: Optimized for mobile devices
- **Touch-Friendly**: Large buttons and intuitive gestures
- **Clean Interface**: Minimal, focused design

## Technology Stack

- **Backend**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL 15+
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla or lightweight framework)
- **Containerization**: Docker & Docker Compose
- **ORM**: SQLAlchemy
- **Migration**: Alembic

## Development Phases

### Phase 1: Project Setup & Database Design
**Deliverables:**
- Project structure and Docker configuration
- PostgreSQL database schema
- Environment configuration
- Basic FastAPI application skeleton

**Tasks:**
1. Create project directory structure
2. Set up Docker Compose with FastAPI + PostgreSQL
3. Design database schema (users, chores, completions)
4. Configure Alembic for migrations
5. Create initial migration
6. Set up environment variables

### Phase 2: Backend API Development
**Deliverables:**
- RESTful API endpoints
- Database models and relationships
- Business logic layer
- Input validation and error handling

**API Endpoints:**

#### User Endpoints
- `GET /api/users` - List all users
- `POST /api/users` - Create user (admin)
- `PUT /api/users/{id}` - Update user (admin)
- `DELETE /api/users/{id}` - Delete user (admin)

#### Chore Endpoints
- `GET /api/chores` - List chores (with filters)
- `POST /api/chores` - Create chore (admin)
- `PUT /api/chores/{id}` - Update chore (admin)
- `DELETE /api/chores/{id}` - Delete chore (admin)
- `GET /api/chores/weekly` - Get weekly chore view

#### Completion Endpoints
- `POST /api/completions` - Mark chore complete
- `GET /api/completions` - Get completion history
- `GET /api/completions/stats` - Get statistics

#### Admin Endpoints
- `POST /api/admin/login` - Admin authentication
- `GET /api/admin/stats` - Dashboard statistics

### Phase 3: Frontend Development
**Deliverables:**
- Mobile-responsive UI
- Weekly chores view
- Admin console
- User selection interface

**Pages:**
1. **Home/Login** - User selection
2. **Weekly View** - Main chore table
3. **Admin Console** - Management interface
4. **History View** - Completion records

### Phase 4: Testing & Documentation
**Deliverables:**
- Unit tests
- Integration tests
- API documentation
- User guide
- Deployment guide

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255),
    is_admin BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Chores Table
```sql
CREATE TABLE chores (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    frequency VARCHAR(20) DEFAULT 'weekly', -- daily, weekly, monthly
    day_of_week INTEGER, -- 0-6 for Monday-Sunday
    assigned_user_id INTEGER REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Completions Table
```sql
CREATE TABLE completions (
    id SERIAL PRIMARY KEY,
    chore_id INTEGER NOT NULL REFERENCES chores(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    week_start DATE NOT NULL,
    notes TEXT
);

CREATE INDEX idx_completions_week ON completions(week_start);
CREATE INDEX idx_completions_chore ON completions(chore_id);
CREATE INDEX idx_completions_user ON completions(user_id);
```

## Project Structure

```
chores-app/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI application
│   │   ├── config.py               # Configuration
│   │   ├── database.py             # Database connection
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── chore.py
│   │   │   └── completion.py
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── chore.py
│   │   │   └── completion.py
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── users.py
│   │   │   ├── chores.py
│   │   │   ├── completions.py
│   │   │   └── admin.py
│   │   └── utils/
│   │       ├── __init__.py
│   │       └── helpers.py
│   ├── alembic/
│   │   ├── versions/
│   │   └── env.py
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_users.py
│   │   ├── test_chores.py
│   │   └── test_completions.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── alembic.ini
├── frontend/
│   ├── static/
│   │   ├── css/
│   │   │   └── styles.css
│   │   ├── js/
│   │   │   ├── main.js
│   │   │   ├── admin.js
│   │   │   └── weekly.js
│   │   └── images/
│   └── templates/
│       ├── index.html
│       ├── weekly.html
│       ├── admin.html
│       └── history.html
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
├── CLAUDE.md                       # This file
└── CONTRIBUTING.md
```

## Development Workflow

### Initial Setup
```bash
# Clone repository
git clone <repo-url>
cd chores-app

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
nano .env

# Start services
docker-compose up -d

# Run migrations
docker-compose exec backend alembic upgrade head

# Create initial admin user
docker-compose exec backend python -m app.utils.create_admin
```

### Development Commands
```bash
# Start development environment
docker-compose up

# Run tests
docker-compose exec backend pytest

# Create new migration
docker-compose exec backend alembic revision --autogenerate -m "description"

# Apply migrations
docker-compose exec backend alembic upgrade head

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

## API Design Principles

1. **RESTful conventions**: Use proper HTTP methods (GET, POST, PUT, DELETE)
2. **Consistent responses**: Standard JSON format for all responses
3. **Error handling**: Clear error messages with appropriate status codes
4. **Validation**: Pydantic schemas for request/response validation
5. **Pagination**: Support pagination for list endpoints
6. **Filtering**: Query parameters for filtering results

## UI/UX Guidelines

### Mobile-First Approach
- Start with mobile design, then scale up
- Touch targets minimum 44x44px
- Readable fonts (minimum 16px base)
- Adequate spacing between elements

### Color Scheme (Suggestions)
- Primary: #4A90E2 (Blue)
- Success: #7ED321 (Green)
- Warning: #F5A623 (Orange)
- Danger: #D0021B (Red)
- Background: #F8F9FA (Light Gray)
- Text: #333333 (Dark Gray)

### Weekly View Design
- Grid layout showing days of week (columns)
- Chores as rows
- Color-coded status (pending, completed, overdue)
- Quick-tap to mark complete
- Swipe gestures for details

## Security Considerations

1. **Admin Protection**: Protect admin endpoints with authentication
2. **Input Validation**: Validate all user inputs
3. **SQL Injection**: Use parameterized queries (SQLAlchemy ORM)
4. **CORS**: Configure appropriate CORS settings
5. **Rate Limiting**: Implement rate limiting for API endpoints
6. **Environment Variables**: Never commit secrets to version control

## Future Enhancements (Post-MVP)

- [ ] Push notifications for upcoming chores
- [ ] Recurring chore templates
- [ ] Point system/gamification
- [ ] Multiple households/groups
- [ ] Dark mode
- [ ] Export data (CSV, PDF)
- [ ] Mobile app (React Native)
- [ ] Chore trading/swapping between users
- [ ] Calendar integration
- [ ] Image attachments for completed chores

## Testing Strategy

### Unit Tests
- Model validation
- Business logic functions
- Utility functions

### Integration Tests
- API endpoints
- Database operations
- Complete workflows

### Manual Testing Checklist
- [ ] User can select their name and view chores
- [ ] User can mark chores complete
- [ ] Admin can add/remove users
- [ ] Admin can add/remove chores
- [ ] Weekly view displays correctly on mobile
- [ ] Filters work correctly
- [ ] History is recorded accurately
- [ ] All CRUD operations work

## Documentation Requirements

### README.md
- Project description
- Quick start guide
- Features list
- Screenshots
- License information

### API Documentation
- Auto-generated with FastAPI/Swagger
- Endpoint descriptions
- Request/response examples
- Authentication requirements

### Deployment Guide
- Server requirements
- Docker deployment steps
- Environment configuration
- Backup procedures
- Troubleshooting

## Success Criteria

- ✅ Application runs in Docker containers
- ✅ Mobile-responsive UI
- ✅ All CRUD operations functional
- ✅ Weekly view displays correctly
- ✅ Completion history tracked
- ✅ Admin console fully functional
- ✅ Filters work as expected
- ✅ Comprehensive documentation
- ✅ Ready for open-source release

## Getting Started with Development

To begin development, start with Phase 1:

1. Review and update this CLAUDE.md file
2. Set up the project structure
3. Configure Docker and Docker Compose
4. Design and implement database schema
5. Create initial FastAPI application

Work through each phase systematically, testing as you go. Use git for version control and commit frequently with descriptive messages.

## Architecture Decisions (Confirmed)

✅ **Answers to Implementation Questions:**

1. **Default admin user**: Yes, create during initial setup using email from `.env` file
2. **Chore assignment**: One user per chore (MVP), can be extended to multiple users in v1.2
3. **Week definition**: Monday is the start of the week (configurable in settings)
4. **Time tracking**: Yes, store exact timestamp (datetime) when chore is completed
5. **Notifications**: Email notifications are optional feature (requires SMTP configuration)
6. **Rotation**: Manual assignment for MVP; automated rotation planned for v1.2

## Next Steps

**Ready to start implementation!** Follow this sequence:

### Immediate Actions:
1. ✅ Review CLAUDE.md (this file) - architecture and features
2. ✅ Review IMPLEMENTATION_PLAN.md - detailed code examples
3. 📋 Review ROADMAP.md - track progress through phases

### Start Development:
```bash
# 1. Set up environment
cp .env.example .env
nano .env  # Add your configuration

# 2. Create project structure (see IMPLEMENTATION_PLAN.md Phase 1.1)

# 3. Start Docker services
docker-compose up -d

# 4. Run database migrations
docker-compose exec backend alembic upgrade head

# 5. Create admin user
docker-compose exec backend python -m app.utils.create_admin
```

### Development Flow:
- **Phase 1**: Complete Docker + Database setup (1-2 days)
- **Phase 2**: Build Backend API (3-5 days)
- **Phase 3**: Create Frontend UI (3-5 days)
- **Phase 4**: Test & Document (2-3 days)

### Working with Claude CLI:
When using Claude Code or CLI, reference this CLAUDE.md file. Claude has detailed implementation code in IMPLEMENTATION_PLAN.md including:
- Complete Docker configuration
- All database models and schemas
- API router implementations
- Frontend CSS and JavaScript
- Testing examples

### Questions or Issues?
- Check IMPLEMENTATION_PLAN.md for code examples
- Review CONTRIBUTING.md for code standards
- Update ROADMAP.md as you complete tasks

**Let's build this! 🚀**
