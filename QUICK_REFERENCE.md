# Quick Reference Guide

## Common Commands

### Docker Operations

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
docker-compose logs -f backend  # Backend only

# Stop services
docker-compose down

# Rebuild containers
docker-compose up -d --build

# Remove volumes (fresh start)
docker-compose down -v
```

### Database Operations

```bash
# Access PostgreSQL CLI
docker-compose exec db psql -U pooluser -d pooldb

# Create new migration
docker-compose exec backend alembic revision --autogenerate -m "description"

# Apply migrations
docker-compose exec backend alembic upgrade head

# Rollback one migration
docker-compose exec backend alembic downgrade -1

# View migration history
docker-compose exec backend alembic history

# Create admin user
docker-compose exec backend python -m app.utils.create_admin

# Database backup
docker exec chores_db pg_dump -U pooluser pooldb > backup_$(date +%Y%m%d).sql

# Restore database
docker exec -i chores_db psql -U pooluser pooldb < backup.sql
```

### Testing

```bash
# Run all tests
docker-compose exec backend pytest

# Run specific test file
docker-compose exec backend pytest tests/test_users.py

# Run with coverage
docker-compose exec backend pytest --cov=app

# Run with verbose output
docker-compose exec backend pytest -v
```

### Development

```bash
# Access backend shell
docker-compose exec backend bash

# Install new Python package
docker-compose exec backend pip install package-name
# Then add to requirements.txt

# Format code
docker-compose exec backend black app/

# Lint code
docker-compose exec backend flake8 app/

# Type checking
docker-compose exec backend mypy app/
```

## Project Structure Overview

```
chores-app/
├── backend/              # FastAPI application
│   ├── app/
│   │   ├── models/      # Database models (SQLAlchemy)
│   │   ├── schemas/     # Pydantic schemas for validation
│   │   ├── routers/     # API endpoint definitions
│   │   ├── utils/       # Helper functions
│   │   ├── config.py    # Application configuration
│   │   ├── database.py  # Database connection
│   │   └── main.py      # FastAPI app entry point
│   ├── alembic/         # Database migrations
│   ├── tests/           # Test files
│   └── requirements.txt # Python dependencies
├── frontend/            # Web interface
│   ├── static/
│   │   ├── css/        # Stylesheets
│   │   └── js/         # JavaScript files
│   └── templates/      # HTML templates
└── docker-compose.yml  # Service definitions
```

## API Endpoints Quick Reference

### Users
- `GET /api/users` - List all users
- `GET /api/users/{id}` - Get specific user
- `POST /api/users` - Create user
- `PUT /api/users/{id}` - Update user
- `DELETE /api/users/{id}` - Delete user

### Chores
- `GET /api/chores` - List all chores
- `GET /api/chores/weekly` - Get weekly view
- `GET /api/chores/{id}` - Get specific chore
- `POST /api/chores` - Create chore
- `PUT /api/chores/{id}` - Update chore
- `DELETE /api/chores/{id}` - Delete chore

### Completions
- `POST /api/completions` - Mark chore complete
- `GET /api/completions` - Get completion history
- `GET /api/completions/stats` - Get statistics
- `DELETE /api/completions/{id}` - Remove completion

## Database Schema Quick Reference

### Users Table
- `id` - Primary key
- `name` - Unique username
- `email` - Optional email
- `is_admin` - Admin flag
- `is_active` - Active status
- `created_at`, `updated_at` - Timestamps

### Chores Table
- `id` - Primary key
- `name` - Chore name
- `description` - Details
- `frequency` - daily/weekly/monthly
- `day_of_week` - 0-6 (Monday-Sunday)
- `assigned_user_id` - Foreign key to users
- `is_active` - Active status
- `created_at`, `updated_at` - Timestamps

### Completions Table
- `id` - Primary key
- `chore_id` - Foreign key to chores
- `user_id` - Foreign key to users
- `completed_at` - Completion timestamp
- `week_start` - Week start date
- `notes` - Optional notes

## Environment Variables

### Required
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password
- `DB_NAME` - Database name
- `SECRET_KEY` - Application secret (generate with `openssl rand -hex 32`)

### Optional
- `DEBUG` - Debug mode (default: False)
- `DEFAULT_USER_EMAIL` - Admin email
- `SMTP_*` - Email configuration
- `SCHEDULER_ENABLED` - Enable scheduler

## Troubleshooting

### Database Connection Issues
```bash
# Check database is running
docker-compose ps

# View database logs
docker-compose logs db

# Restart database
docker-compose restart db
```

### Migration Issues
```bash
# Reset database (WARNING: deletes all data)
docker-compose down -v
docker-compose up -d
docker-compose exec backend alembic upgrade head
```

### Port Already in Use
```bash
# Find process using port 8000
lsof -i :8000

# Change port in docker-compose.yml
ports:
  - "8001:8000"  # Use port 8001 instead
```

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "Description of changes"

# Push to remote
git push origin feature/your-feature-name

# Create pull request on GitHub
```

## Code Style Guidelines

### Python (Backend)
- Follow PEP 8
- Use type hints
- Maximum line length: 88 characters (Black default)
- Use docstrings for functions and classes

### JavaScript (Frontend)
- Use ES6+ features
- Use const/let instead of var
- Use async/await for promises
- Add comments for complex logic

### SQL
- Use uppercase for SQL keywords
- Use snake_case for table and column names
- Add indexes for foreign keys

## Testing Guidelines

### Unit Tests
- Test individual functions and methods
- Mock external dependencies
- Aim for >80% code coverage

### Integration Tests
- Test API endpoints end-to-end
- Use test database
- Clean up test data after each test

### Manual Testing Checklist
- [ ] User can select name and view chores
- [ ] User can mark chores complete
- [ ] Admin can manage users
- [ ] Admin can manage chores
- [ ] Filters work correctly
- [ ] Mobile responsive design works
- [ ] Error messages are clear

## Performance Tips

### Database
- Add indexes to frequently queried columns
- Use query pagination for large datasets
- Optimize JOIN queries
- Use connection pooling

### Frontend
- Minimize HTTP requests
- Cache static assets
- Use loading indicators
- Implement lazy loading

### Docker
- Use multi-stage builds
- Minimize image layers
- Use .dockerignore
- Clean up unused images/volumes

## Security Checklist

- [ ] Use strong SECRET_KEY
- [ ] Set DEBUG=False in production
- [ ] Use HTTPS in production
- [ ] Implement rate limiting
- [ ] Validate all user inputs
- [ ] Sanitize database queries
- [ ] Keep dependencies updated
- [ ] Regular security audits

## Useful Links

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [Docker Documentation](https://docs.docker.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Alembic Documentation](https://alembic.sqlalchemy.org/)

## Getting Help

1. Check this quick reference
2. Review CLAUDE.md for architecture decisions
3. Review IMPLEMENTATION_PLAN.md for detailed code
4. Check ROADMAP.md for current status
5. Search existing GitHub issues
6. Create new issue with details
