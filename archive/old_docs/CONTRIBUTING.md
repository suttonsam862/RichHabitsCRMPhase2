# Contributing Guide

Thank you for your interest in contributing to the Custom Clothing Business Management Platform! This guide will help you get started with development, testing, and submitting contributions.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style & Standards](#code-style--standards)
- [Testing](#testing)
- [Database Changes](#database-changes)
- [Pull Request Process](#pull-request-process)
- [Project Structure](#project-structure)
- [Common Tasks](#common-tasks)

## Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **PostgreSQL** database (or Supabase account)
- **Git** for version control

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd custom-clothing-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Set up the database**
   ```bash
   npm run db:push
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5000`.

## Development Workflow

### Branch Strategy

- **main**: Production-ready code
- **develop**: Integration branch for features
- **feature/**: Feature development branches
- **bugfix/**: Bug fix branches
- **hotfix/**: Critical production fixes

### Creating a Feature Branch

```bash
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
```

### Development Process

1. **Create a feature branch** from `develop`
2. **Implement your changes** following coding standards
3. **Write/update tests** for your changes
4. **Run quality checks** before committing
5. **Submit a pull request** with clear description

### Quality Checks

Before committing, always run:

```bash
# TypeScript type checking
npm run check

# Run tests
npm run test

# Lint code
npm run lint
```

## Code Style & Standards

### TypeScript/JavaScript

- **TypeScript First**: Use TypeScript for all new code
- **Strict Types**: Enable strict type checking, avoid `any`
- **Functional Style**: Prefer functional programming patterns
- **Modern Syntax**: Use ES6+ features, async/await over promises

### Code Formatting

We use ESLint and Prettier for consistent code formatting:

```bash
# Lint and fix code
npm run lint

# Format code (if available)
npm run format
```

### Component Guidelines

#### React Components

```typescript
// Good: Functional component with proper typing
interface UserCardProps {
  user: User;
  onEdit: (user: User) => void;
}

export function UserCard({ user, onEdit }: UserCardProps) {
  return (
    <div data-testid="user-card">
      <h3>{user.fullName}</h3>
      <button onClick={() => onEdit(user)}>Edit</button>
    </div>
  );
}
```

#### Component Structure

- **Single Responsibility**: One concern per component
- **Props Interface**: Always define TypeScript interfaces for props
- **Test IDs**: Add `data-testid` for testable elements
- **Error Boundaries**: Wrap complex components in error boundaries

### API Guidelines

#### Route Structure

```typescript
// Good: Clear, RESTful routes with proper error handling
router.get('/organizations/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const organization = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, id))
    .limit(1);

  if (!organization.length) {
    return sendErr(res, 'Organization not found', 404);
  }

  sendOk(res, dbRowToDto(organization[0]));
}));
```

#### Response Format

Always use standardized response helpers:

```typescript
// Success responses
sendOk(res, data, count?, statusCode?);

// Error responses  
sendErr(res, message, statusCode?);
```

### Database Guidelines

#### Schema Changes

1. **Never manually write SQL migrations**
2. **Update Drizzle schema** in `shared/schema.ts`
3. **Run `npm run db:push`** to sync changes
4. **Test thoroughly** before committing

#### Query Patterns

```typescript
// Good: Type-safe queries with proper error handling
const results = await db
  .select()
  .from(users)
  .where(and(
    eq(users.isActive, true),
    ilike(users.email, `%${searchTerm}%`)
  ))
  .orderBy(desc(users.createdAt))
  .limit(pageSize)
  .offset(offset);
```

## Testing

### Testing Strategy

- **Unit Tests**: Individual functions and components
- **Integration Tests**: API endpoints and database operations
- **Component Tests**: React component behavior
- **E2E Tests**: Complete user workflows

### Writing Tests

#### Unit Tests

```typescript
// tests/unit/validation.test.ts
import { describe, it, expect } from 'vitest';
import { validateEmail } from '@/lib/validation';

describe('Email Validation', () => {
  it('accepts valid email addresses', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('test.email+tag@domain.co.uk')).toBe(true);
  });

  it('rejects invalid email addresses', () => {
    expect(validateEmail('invalid-email')).toBe(false);
    expect(validateEmail('@domain.com')).toBe(false);
  });
});
```

#### Component Tests

```typescript
// tests/unit/UserCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { UserCard } from '@/components/UserCard';

describe('UserCard', () => {
  const mockUser = {
    id: '1',
    fullName: 'John Doe',
    email: 'john@example.com'
  };

  it('displays user information', () => {
    render(<UserCard user={mockUser} onEdit={() => {}} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('calls onEdit when edit button clicked', () => {
    const onEdit = vi.fn();
    render(<UserCard user={mockUser} onEdit={onEdit} />);
    
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    expect(onEdit).toHaveBeenCalledWith(mockUser);
  });
});
```

### Running Tests

```bash
# Run all tests
npm run test

# Run specific test files
npm run test tests/unit/validation.test.ts

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Test Requirements

- **Test Coverage**: Aim for >80% coverage on new code
- **Edge Cases**: Test error conditions and edge cases
- **User Flows**: Include integration tests for critical user paths
- **Accessibility**: Test for keyboard navigation and screen readers

## Database Changes

### Safe Database Operations

1. **Schema Updates**
   ```bash
   # Edit shared/schema.ts
   # Then sync to database
   npm run db:push
   ```

2. **Force Push** (when needed)
   ```bash
   npm run db:push --force
   ```

3. **Schema Inspection**
   ```bash
   npm run db:introspect
   ```

### Migration Best Practices

- **Backwards Compatible**: Ensure changes don't break existing data
- **Test Thoroughly**: Always test migrations on development data
- **Backup First**: In production, always backup before schema changes
- **Coordinate**: Communicate schema changes with team

### Field Naming Conventions

- **Database**: Use `snake_case` for all field names
- **API/Frontend**: Use `camelCase` for all field names
- **Mapping**: Use provided utilities for conversion between cases

## Pull Request Process

### Before Submitting

1. **Update from develop**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout your-branch
   git rebase develop
   ```

2. **Run quality checks**
   ```bash
   npm run check
   npm run test
   npm run lint
   ```

3. **Test your changes** manually in the browser

### PR Description Template

```markdown
## Description
Brief description of changes and motivation.

## Type of Change
- [ ] Bug fix
- [ ] New feature  
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Screenshots
Include screenshots for UI changes.

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Tests pass locally
- [ ] Documentation updated
```

### Review Process

1. **Automated Checks**: CI/CD runs tests and linting
2. **Code Review**: Team member reviews code quality and logic
3. **Manual Testing**: Reviewer tests functionality
4. **Approval**: Changes approved and merged

## Project Structure

### Key Directories

```
├── client/src/
│   ├── components/     # Reusable UI components
│   ├── pages/         # Page-level components
│   ├── lib/           # Utility functions
│   └── hooks/         # Custom React hooks
├── server/
│   ├── routes/        # API route handlers
│   ├── lib/           # Server utilities
│   └── db/           # Database configuration
├── shared/           # Code shared between client/server
│   ├── schema.ts     # Database schema
│   └── dtos/         # Data transfer objects
└── tests/           # Test suites
```

### Import Guidelines

```typescript
// Absolute imports for internal modules
import { Button } from '@/components/ui/button';
import { sendOk } from '@/lib/http';

// Relative imports for nearby files
import { validateUser } from './validation';

// External libraries
import { z } from 'zod';
import express from 'express';
```

## Common Tasks

### Adding a New API Endpoint

1. **Define the route** in appropriate router file
2. **Add validation schema** using Zod
3. **Implement handler** with proper error handling
4. **Add tests** for the endpoint
5. **Update API documentation**

### Creating a New Component

1. **Create component file** in appropriate directory
2. **Define TypeScript interfaces** for props
3. **Add data-testid attributes** for testing
4. **Write component tests**
5. **Update component documentation**

### Database Schema Changes

1. **Update `shared/schema.ts`**
2. **Update relations** in `shared/relations.ts`
3. **Run `npm run db:push`**
4. **Update DTOs** if needed
5. **Test the changes**

### Adding Dependencies

1. **Install package**
   ```bash
   npm install package-name
   npm install -D @types/package-name  # if needed
   ```

2. **Update documentation** if it affects API or usage
3. **Consider bundle size** impact
4. **Test thoroughly**

## Getting Help

### Resources

- **Documentation**: Check existing docs in this repo
- **Issues**: Search existing GitHub issues
- **Team Chat**: Reach out on team communication channels
- **Code Review**: Ask for guidance during PR reviews

### Debugging Tips

1. **Check browser console** for frontend issues
2. **Check server logs** for backend issues
3. **Use TypeScript compiler** to catch type errors
4. **Run tests** to identify regressions
5. **Use debugger** breakpoints for complex issues

### Performance Monitoring

- **Bundle Analysis**: Use `npm run build` and check bundle sizes
- **Database Queries**: Monitor query performance in development
- **API Response Times**: Check network tab for slow requests
- **Memory Usage**: Monitor for memory leaks in long-running processes

Thank you for contributing! Your efforts help make this platform better for everyone.