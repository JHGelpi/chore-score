# Weekly Chores Web App 🏠

A mobile-friendly weekly chores management system for families and housemates. Built with Python, FastAPI, PostgreSQL, and Docker.

## Features

- 📱 **Mobile-First Design** - Optimized for smartphones and tablets
- 👥 **Simple User Management** - No passwords needed, just select your name
- 📅 **Weekly View** - See all chores at a glance
- ✅ **Completion Tracking** - Track who completed what and when
- 🔧 **Admin Console** - Easy management of users and chores
- 🔍 **Filtering** - Filter by user, chore, or completion status
- 📊 **History** - Complete audit trail of all completed chores

## Quick Start

### Prerequisites

- Docker Desktop or Docker Engine 20.10+
- Docker Compose 2.0+
- Git
- 512MB RAM minimum
- 1GB storage space

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd chores-app
```

2. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your settings (use a strong SECRET_KEY)
```

3. **Build and start services**
```bash
docker-compose up -d
```

4. **Run database migrations**
```bash
docker-compose exec backend alembic upgrade head
```

5. **Create initial admin user**
```bash
docker-compose exec backend python -m app.utils.create_admin
```

6. **Access the application**
- Main app: http://localhost:8001
- API docs: http://localhost:8001/docs
- Admin console: http://localhost:8001/admin

### Development Status

⚠️ **Note**: This project is currently in active development. Check the [ROADMAP.md](ROADMAP.md) for current progress and [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) for detailed implementation guidance.

**Current Phase**: Phase 1 - Project Setup (15% complete)

## Usage

### For Regular Users

1. Open the app on your mobile device or browser
2. Select your name from the list
3. View your weekly chores
4. Tap a chore to mark it complete
5. View history to see past completions

### For Administrators

1. Access the admin console
2. Add or remove users
3. Create and manage chores
4. Assign chores to users
5. View completion statistics

## Development

### Project Structure

```
chores-app/
├── backend/          # FastAPI application
├── frontend/         # HTML/CSS/JS
├── docker-compose.yml
└── .env.example
```

### Running Tests

```bash
docker-compose exec backend pytest
```

### Database Migrations

```bash
# Create a new migration
docker-compose exec backend alembic revision --autogenerate -m "description"

# Apply migrations
docker-compose exec backend alembic upgrade head
```

## Technology Stack

- **Backend**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL 15+
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Containerization**: Docker & Docker Compose
- **ORM**: SQLAlchemy
- **Migrations**: Alembic

## API Documentation

Interactive API documentation is available at `/docs` when the application is running.

### Key Endpoints

- `GET /api/users` - List all users
- `GET /api/chores` - List chores
- `GET /api/chores/weekly` - Get weekly view
- `POST /api/completions` - Mark chore complete
- `GET /api/completions` - Get completion history

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Configuration

Key environment variables in `.env`:

```bash
# Database
DB_USER=pooluser
DB_PASSWORD=your_secure_password
DB_NAME=pooldb

# Application
SECRET_KEY=your-secret-key
DEBUG=False
DEFAULT_USER_EMAIL=admin@example.com
```

See `.env.example` for all available options.

## Deployment

### Docker Deployment

The application is designed to run in Docker containers. For production:

1. Set `DEBUG=False` in `.env`
2. Use a strong `SECRET_KEY`
3. Configure proper database credentials
4. Set up HTTPS with a reverse proxy (nginx)
5. Configure backups for the PostgreSQL database

### Environment Requirements

- Docker Engine 20.10+
- Docker Compose 2.0+
- Minimum 512MB RAM
- 1GB storage

## Roadmap

- [ ] Push notifications
- [ ] Chore rotation/assignment logic
- [ ] Point system and gamification
- [ ] Multiple households support
- [ ] Dark mode
- [ ] Mobile app (React Native)
- [ ] Export functionality (CSV, PDF)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have questions:

1. Check the [documentation](CLAUDE.md)
2. Search existing [issues](https://github.com/username/chores-app/issues)
3. Open a new issue with detailed information

## Acknowledgments

- Built with [FastAPI](https://fastapi.tiangolo.com/)
- Database powered by [PostgreSQL](https://www.postgresql.org/)
- Containerized with [Docker](https://www.docker.com/)

## Screenshots

*(Add screenshots here once the UI is implemented)*

---

Made with ❤️ for better household management
