# Contributing to Weekly Chores Web App

Thank you for considering contributing to the Weekly Chores Web App! This document provides guidelines and instructions for contributing.

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors, regardless of experience level, background, or identity.

### Our Standards

- Be respectful and considerate in communication
- Welcome constructive feedback
- Focus on what's best for the community
- Show empathy towards other contributors

## How to Contribute

### Reporting Bugs

Before submitting a bug report:
1. Check existing issues to avoid duplicates
2. Verify the bug with the latest version
3. Collect relevant information (logs, screenshots, steps to reproduce)

When submitting a bug report, include:
- **Clear title** describing the issue
- **Description** of the bug
- **Steps to reproduce** the behavior
- **Expected behavior**
- **Actual behavior**
- **Environment details** (OS, browser, Docker version)
- **Screenshots or logs** if applicable

### Suggesting Features

We welcome feature suggestions! When proposing a feature:
1. Check if it's already been suggested
2. Clearly describe the feature and its benefits
3. Explain the use case
4. Consider implementation complexity

### Pull Request Process

1. **Fork the repository** and create a branch from `main`
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow the coding standards (see below)
   - Add tests for new functionality
   - Update documentation as needed

3. **Test your changes**
   ```bash
   docker-compose exec backend pytest
   ```

4. **Commit your changes**
   - Use clear, descriptive commit messages
   - Follow conventional commit format:
     - `feat:` for new features
     - `fix:` for bug fixes
     - `docs:` for documentation
     - `style:` for formatting
     - `refactor:` for code refactoring
     - `test:` for adding tests
     - `chore:` for maintenance tasks

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Open a Pull Request**
   - Provide a clear description of changes
   - Reference any related issues
   - Wait for review and address feedback

## Development Setup

### Prerequisites

- Docker and Docker Compose
- Git
- A code editor (VS Code recommended)

### Local Development

1. Clone your fork:
   ```bash
   git clone https://github.com/your-username/chores-app.git
   cd chores-app
   ```

2. Set up environment:
   ```bash
   cp .env.example .env
   # Edit .env with development settings
   ```

3. Start development environment:
   ```bash
   docker-compose up
   ```

4. Access the application:
   - App: http://localhost:8000
   - API docs: http://localhost:8000/docs

## Coding Standards

### Python (Backend)

- **Style Guide**: Follow PEP 8
- **Line Length**: Maximum 100 characters
- **Imports**: Use absolute imports, group by standard/third-party/local
- **Type Hints**: Use type hints for function parameters and return values
- **Docstrings**: Use Google-style docstrings for functions and classes

Example:
```python
from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

def get_user_chores(
    user_id: int,
    week_start: Optional[str] = None,
    db: Session = Depends(get_db)
) -> List[ChoreSchema]:
    """
    Retrieve chores assigned to a specific user.
    
    Args:
        user_id: The ID of the user
        week_start: Optional ISO format date for week start
        db: Database session
        
    Returns:
        List of chore objects
    """
    # Implementation
    pass
```

### JavaScript (Frontend)

- **Style**: Use ES6+ features
- **Naming**: camelCase for variables and functions
- **Semicolons**: Required
- **Quotes**: Single quotes for strings
- **Comments**: Use JSDoc for functions

Example:
```javascript
/**
 * Mark a chore as complete
 * @param {number} choreId - The ID of the chore
 * @param {number} userId - The ID of the user
 * @returns {Promise<Object>} The completion record
 */
async function markChoreComplete(choreId, userId) {
    const response = await fetch('/api/completions', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({choreId, userId})
    });
    return response.json();
}
```

### CSS

- **Methodology**: Use BEM naming convention
- **Units**: Use rem for fonts, px for borders
- **Colors**: Define variables for theme colors
- **Mobile-First**: Write mobile styles first, then media queries

Example:
```css
:root {
    --primary-color: #4A90E2;
    --text-color: #333333;
}

.chore-card {
    padding: 1rem;
    border: 1px solid var(--primary-color);
}

.chore-card__title {
    font-size: 1.125rem;
    color: var(--text-color);
}

@media (min-width: 768px) {
    .chore-card {
        padding: 1.5rem;
    }
}
```

## Testing Guidelines

### Unit Tests

- Write tests for all new functions
- Aim for >80% code coverage
- Use descriptive test names

```python
def test_create_user_with_valid_data():
    """Test that a user can be created with valid data"""
    # Arrange
    user_data = {"name": "John Doe", "email": "john@example.com"}
    
    # Act
    user = create_user(user_data)
    
    # Assert
    assert user.name == "John Doe"
    assert user.email == "john@example.com"
```

### Integration Tests

- Test complete workflows
- Use test database
- Clean up after tests

## Documentation

### Code Documentation

- Document all public functions and classes
- Include parameter descriptions and return types
- Provide usage examples for complex functions

### User Documentation

- Update README.md for user-facing changes
- Add screenshots for UI changes
- Update API documentation in docstrings

## Commit Message Guidelines

Good commit messages help maintain a clear project history.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Maintenance tasks

### Examples

```
feat(api): add endpoint for weekly chore summary

Implement GET /api/chores/weekly endpoint that returns
a summary of all chores for the current week, grouped
by day and user.

Closes #42
```

```
fix(ui): correct mobile layout on weekly view

The chore cards were overflowing on small screens.
Updated CSS to use flexbox with proper wrapping.

Fixes #38
```

## Review Process

### What Reviewers Look For

- Code quality and readability
- Test coverage
- Documentation completeness
- Adherence to coding standards
- No breaking changes (or properly documented)

### Timeline

- Initial review within 2-3 days
- Follow-up reviews within 1-2 days
- Merged after approval from maintainer

## Getting Help

- **Questions**: Open a discussion or issue
- **Chat**: (Add Discord/Slack link if available)
- **Documentation**: Check CLAUDE.md for detailed info

## Recognition

Contributors will be added to a CONTRIBUTORS.md file and mentioned in release notes.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Weekly Chores Web App! 🎉
