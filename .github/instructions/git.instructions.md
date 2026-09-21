---
applyTo: ".git/**/*"
description: "Git workflow, commit conventions, and branching strategy"
---

# Git Workflow Instructions

## Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring without changing functionality
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks (dependencies, build config, etc.)
- `ci`: CI/CD changes
- `revert`: Revert a previous commit

### Scopes

Use workspace names as scopes:

- `api` - Backend API changes
- `app` - Main React app changes
- `admin` - Admin panel changes
- `web` - Landing pages changes
- `docs` - Documentation site changes
- `ui` - UI package changes
- `auth` - Auth package changes
- `client` - API client changes

### Examples

```bash
feat(api): add user registration endpoint

Implement user registration with email validation
and password strength requirements.

Closes #123

---

fix(app): resolve authentication redirect loop

Fixed infinite redirect when token expires by adding
proper token validation before navigation.

---

docs(api): update authentication documentation

Added examples for JWT token usage and refresh flow.

---

chore(deps): update dependencies across workspaces

Updated NestJS to v11, React to v19, and other minor updates.
```

### Breaking Changes

```bash
feat(api)!: change user entity structure

BREAKING CHANGE: User entity now uses `fullName` instead of
separate `firstName` and `lastName` fields. Update all client
code to use the new field.

Migration guide: ...
```

## Branching Strategy

### Main Branches

- `main` - Production-ready code
- `develop` - Development branch (if using gitflow)

### Feature Branches

```bash
# Feature branch naming
feature/<scope>/<description>

# Examples
feature/api/user-registration
feature/app/profile-page
feature/ui/data-table-component
```

### Bugfix Branches

```bash
# Bugfix branch naming
fix/<scope>/<description>

# Examples
fix/api/auth-token-validation
fix/app/login-redirect
```

### Hotfix Branches

```bash
# For urgent production fixes
hotfix/<description>

# Example
hotfix/security-vulnerability
```

## Git Workflow

### Starting New Feature

```bash
# Create feature branch from main
git checkout main
git pull origin main
git checkout -b feature/api/new-endpoint

# Make changes and commit
git add .
git commit -m "feat(api): add new endpoint for X"

# Push to remote
git push origin feature/api/new-endpoint

# Create pull request
```

### Keeping Branch Updated

```bash
# Rebase on main to keep history clean
git checkout main
git pull origin main
git checkout feature/api/new-endpoint
git rebase main

# Resolve conflicts if any
git add .
git rebase --continue

# Force push (since history was rewritten)
git push origin feature/api/new-endpoint --force-with-lease
```

### Squashing Commits (Optional)

```bash
# Squash last 3 commits
git rebase -i HEAD~3

# In editor, mark commits as 'squash' or 'fixup'
# Save and close

# Force push
git push origin feature/api/new-endpoint --force-with-lease
```

## Pull Request Guidelines

### PR Title

Follow commit convention:

```
feat(api): add user registration endpoint
fix(app): resolve authentication redirect loop
```

### PR Description Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Changes Made

- Change 1
- Change 2
- Change 3

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist

- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests pass locally

## Screenshots (if applicable)

## Related Issues

Closes #123
Relates to #456
```

## Code Review

### As Author

1. Keep PRs small and focused
2. Write clear PR description
3. Add screenshots/videos for UI changes
4. Respond to feedback promptly
5. Update PR based on review comments

### As Reviewer

1. Review within 24 hours
2. Be constructive and respectful
3. Test the changes locally if needed
4. Approve when ready or request changes
5. Leave specific, actionable comments

## Git Hooks

### Pre-commit

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

pnpm lint-staged
```

### Commit-msg

```bash
# .husky/commit-msg
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

pnpm commitlint --edit $1
```

### Pre-push

```bash
# .husky/pre-push
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

pnpm check-types
pnpm test
```

## .gitignore

Ensure these are ignored:

```gitignore
# Dependencies
node_modules/
.pnp
.pnp.js

# Build outputs
dist/
build/
.next/
out/

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Cache
.turbo/
.cache/

# Logs
logs/
*.log

# Test coverage
coverage/
```

## Best Practices

1. **Atomic commits** - One logical change per commit
2. **Descriptive messages** - Clear commit messages following convention
3. **Small PRs** - Easier to review and less likely to have conflicts
4. **Rebase workflow** - Keep history clean with rebase instead of merge
5. **Feature branches** - Never commit directly to main
6. **Test before push** - Run tests and linting locally
7. **Meaningful branch names** - Use descriptive branch names
8. **Delete merged branches** - Clean up after PR is merged
9. **Sign commits** - Use GPG signing for verified commits (optional)
10. **Review own code** - Self-review before requesting review

## Versioning

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

```bash
# Example versions
v1.0.0 - Initial release
v1.1.0 - Added new feature
v1.1.1 - Fixed bug
v2.0.0 - Breaking change
```

## Release Process

```bash
# Update version
pnpm version minor # or major, patch

# Create git tag
git tag v1.1.0

# Push with tags
git push origin main --tags

# Create GitHub release
# Use GitHub UI or CLI to create release notes
```
