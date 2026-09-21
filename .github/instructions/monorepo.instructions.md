---
applyTo: "{package.json,turbo.json,pnpm-workspace.yaml}"
description: "Monorepo management, workspace commands, and build orchestration"
---

# Monorepo Instructions

## Overview

Ecbot uses a monorepo architecture managed by Turborepo and pnpm workspaces.

## Workspace Structure

```
eccho/
├── apps/
│   ├── api/          # NestJS backend API
│   ├── app/          # Main React app
│   ├── admin/        # Admin panel
│   ├── web/          # Next.js landing pages
│   └── docs/         # Documentation site
├── packages/
│   ├── ui/           # Shared UI components
│   ├── auth/         # Auth utilities
│   ├── client/       # Generated API client
│   ├── typescript-config/  # Shared TS configs
│   └── eslint-config/      # Shared ESLint configs
└── scripts/          # Build and deployment scripts
```

## Package Manager: pnpm

### Why pnpm?

- Efficient disk space usage
- Fast installation
- Strict dependency resolution
- Built-in workspace support

### Common Commands

```bash
# Install dependencies
pnpm install

# Add dependency to specific workspace
pnpm --filter api add nestjs-something
pnpm --filter app add react-something

# Add dev dependency
pnpm --filter api add -D @types/something

# Remove dependency
pnpm --filter api remove something

# Update dependencies
pnpm update

# Update specific package
pnpm --filter api update nestjs-something
```

## Turborepo

### Build Orchestration

Turborepo handles task orchestration, caching, and parallelization.

### Common Tasks

```bash
# Run all apps in development mode
pnpm dev

# Run specific app
pnpm --filter api dev
pnpm --filter app dev
pnpm --filter admin dev

# Build all apps
pnpm build

# Build specific app
pnpm --filter api build

# Lint all packages
pnpm lint

# Lint specific package
pnpm --filter app lint

# Format code
pnpm format

# Type check
pnpm check-types
```

### Database Commands

```bash
# Create migration
pnpm db:migrate:create

# Run migrations
pnpm db:migrate:up

# Rollback migration
pnpm db:migrate:down

# List migrations
pnpm db:migrate:list

# Check migration status
pnpm db:migrate:check

# Fresh database (drop + migrate)
pnpm db:migrate:fresh

# Run seeders
pnpm db:seed

# Create seeder
pnpm db:seed:create
```

### API Client Generation

```bash
# Generate TypeScript client from OpenAPI spec
pnpm generate:client
```

## Workspace Dependencies

### Internal Package References

Reference internal packages in `package.json`:

```json
{
  "dependencies": {
    "@eccho/ui": "workspace:*",
    "@eccho/auth": "workspace:*",
    "@eccho/client": "workspace:*"
  }
}
```

### Adding New Workspace

1. Create workspace folder in `apps/` or `packages/`
2. Add `package.json` with unique name
3. Update `pnpm-workspace.yaml` if needed
4. Run `pnpm install`

## Turbo Configuration

### turbo.json

Defines task pipelines and caching strategy:

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "outputs": []
    }
  }
}
```

### Task Dependencies

- `^build` - Depends on dependencies being built first
- `build` - Depends on current workspace build
- `dev` - No caching, runs continuously

## Environment Variables

### Per-Workspace .env Files

Each app has its own `.env` file:

```
apps/
├── api/.env          # API environment variables
├── app/.env          # App environment variables
└── admin/.env        # Admin environment variables
```

### Shared Environment Variables

Use root `.env` for shared variables, but prefer workspace-specific configs.

## Build Pipeline

### Development

```bash
pnpm dev  # Starts all apps in parallel
```

### Production Build

```bash
# Build all workspaces
pnpm build

# Build only necessary workspaces
pnpm --filter api build
pnpm --filter app build
```

### Deployment

```bash
# API deployment
pnpm --filter api build
pnpm --filter api start:prod

# Frontend deployment
pnpm --filter app build
pnpm --filter web build
```

## Caching

Turborepo caches task outputs for faster builds:

- Local cache: `.turbo/`
- Remote cache: Configure in turbo.json for team sharing

### Clear Cache

```bash
# Clear turbo cache
rm -rf .turbo

# Clear node_modules
rm -rf node_modules
pnpm install
```

## Workspace Scripts

### Adding Global Scripts

Add scripts to root `package.json`:

```json
{
  "scripts": {
    "custom-task": "turbo run custom-task"
  }
}
```

### Workspace-Specific Scripts

Add to workspace `package.json`:

```json
{
  "scripts": {
    "start": "node dist/main.js",
    "test": "jest"
  }
}
```

## Best Practices

1. **Use workspace protocol** - `workspace:*` for internal deps
2. **Run from root** - Use `pnpm --filter` for workspace-specific commands
3. **Leverage caching** - Configure turbo.json for optimal caching
4. **Shared configs** - Use shared packages for TypeScript, ESLint configs
5. **Version consistency** - Keep dependency versions aligned across workspaces
6. **Atomic commits** - Commit related changes across workspaces together
7. **Build order** - Let Turborepo handle build dependencies
8. **Clean installs** - Remove `node_modules` when dependency issues occur
9. **Lock file** - Commit `pnpm-lock.yaml` to version control
10. **Workspace naming** - Use `@eccho/` prefix for internal packages

## Troubleshooting

### Dependency Issues

```bash
# Remove all node_modules
rm -rf node_modules apps/*/node_modules packages/*/node_modules

# Clear pnpm store
pnpm store prune

# Reinstall
pnpm install
```

### Build Issues

```bash
# Clear turbo cache
rm -rf .turbo

# Clean build
pnpm build --force
```

### Type Errors

```bash
# Check types across all workspaces
pnpm check-types
```
