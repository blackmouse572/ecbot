---
applyTo: "**/*.{ts,tsx}"
---

# GitHub Copilot Instructions for Ecbot

## Overview

Ecbot is an automated Facebook tools platform built on a monorepo architecture using Turborepo and pnpm. This repository contains specialized instructions for different parts of the codebase.

## Instruction Files Organization

The instructions are organized by workspace and purpose:

### Backend API (`apps/api`)

- **[API Architecture](./instructions/api/architecture.instructions.md)** - Module structure, patterns, and organization
- **[API Authentication & Authorization](./instructions/api/auth.instructions.md)** - JWT, RBAC, CASL, protection decorators
- **[API Database](./instructions/api/database.instructions.md)** - MikroORM, repositories, entities, migrations
- **[API Response & Validation](./instructions/api/response.instructions.md)** - Response handling, validation, error handling
- **[API Background Jobs](./instructions/api/jobs.instructions.md)** - BullMQ processors and queue management

### Frontend Apps

- **[React App](./instructions/app/react.instructions.md)** - Main user-facing Vite + React app
- **[Admin Panel](./instructions/admin/admin.instructions.md)** - Admin dashboard application
- **[Web Landing](./instructions/web/web.instructions.md)** - Next.js landing pages
- **[Docs Site](./instructions/docs/docs.instructions.md)** - Documentation site

### Shared Packages

- **[UI Components](./instructions/packages/ui.instructions.md)** - Shared UI component library
- **[Auth Package](./instructions/packages/auth.instructions.md)** - Authentication utilities
- **[API Client](./instructions/packages/client.instructions.md)** - Generated API client

### Repository-Wide

- **[Monorepo](./instructions/monorepo.instructions.md)** - Workspace management, commands, and standards
- **[TypeScript](./instructions/typescript.instructions.md)** - TypeScript conventions and standards
- **[Git Workflow](./instructions/git.instructions.md)** - Commit conventions and branching strategy

## Quick Reference

### Technology Stack

- **Backend**: NestJS 11 + PostgreSQL + MikroORM + Redis + BullMQ
- **Frontend**: React 19 + Vite + Tailwind CSS 4 + TanStack Query
- **Auth**: JWT (ES512) + CASL + RBAC
- **Monorepo**: Turborepo + pnpm

### Essential Commands

```bash
pnpm dev                    # Start all apps
pnpm --filter api dev       # Start API only
pnpm build                  # Build all
pnpm db:migrate:up          # Run migrations
pnpm generate:client        # Generate API client
```

## Getting Help

1. Check the specific instruction file for your current workspace
2. Review existing code for similar patterns
3. Consult the comprehensive docs in `apps/api/docs/`
4. Follow the established patterns and conventions

**Remember**: Consistency, type safety, and clean architecture are paramount.

## Architecture Patterns

### Backend Architecture

#### 1. Module Structure

Follow the standard NestJS module structure with clear separation of concerns:

```
modules/[feature]/
├── controllers/           # Request handlers (admin, user, system, public, shared)
├── decorators/            # Custom decorators
├── docs/                  # OpenAPI documentation
├── dtos/                  # Data Transfer Objects (request/response)
├── entities/              # MikroORM entities (database models)
├── enums/                 # TypeScript enums
├── guards/                # Feature-specific guards
├── interfaces/            # TypeScript interfaces
├── processors/            # BullMQ background job processors
├── repositories/          # Data access layer (Repository pattern)
├── services/              # Business logic
└── [feature].module.ts    # Module definition
```

#### 2. Repository Pattern

Always use the Repository pattern for database access:

```typescript
// Entity (PostgreSQL with MikroORM)
@Entity({ tableName: "users" })
export class UserEntity extends DatabaseEntity {
  @Property()
  email: string;

  @Property()
  username: string;

  @Property({ type: "timestamp", onCreate: () => new Date() })
  createdAt: Date;

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date;

  @Property({ nullable: true })
  deletedAt?: Date; // Soft delete support
}

// Repository
@Injectable()
export class UserRepository extends EntityRepository<UserEntity> {
  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.findOne({ email });
  }
}

// Service
@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async create(dto: UserCreateDto): Promise<UserEntity> {
    const user = this.userRepository.create(dto);
    await this.userRepository.getEntityManager().persistAndFlush(user);
    return user;
  }
}
```

#### 3. Controller Organization

Controllers are organized by access level:

- `*.admin.controller.ts` - Admin operations (requires ADMIN or SUPER_ADMIN role)
- `*.user.controller.ts` - Authenticated user operations
- `*.public.controller.ts` - Unauthenticated public access
- `*.system.controller.ts` - System/internal operations
- `*.shared.controller.ts` - Multi-role endpoints
- `*.workspace.controller.ts` - Workspace-specific operations

### 4. Protection Decorator Order

When using multiple protection decorators, apply them in this exact order (bottom to top):

```typescript
@ExampleDoc()                      // Documentation (top) - ALWAYS REQUIRED
@PolicyAbilityProtected({...})     // CASL ability check
@PolicyRoleProtected(...)          // Role-based check
@UserProtected()                   // User existence check
@AuthJwtAccessProtected()          // JWT validation (required base)
@ApiKeyProtected()                 // API key validation (if needed)
@Get('/endpoint')                  // HTTP method decorator (bottom)
async method() {}
```

**Critical**:

- Documentation decorator (from `docs/` folder) is ALWAYS required at the top
- `@AuthJwtAccessProtected()` is ALWAYS required for protected routes

### 5. Response Handling

Always use standardized response decorators:

```typescript
// Standard response
@Response('user.get', { serialization: UserGetSerialization })
@Get('/:user')
async get(@GetUser() user: UserEntity): Promise<IResponse> {
    return { data: user };
}

// Pagination response
@ResponsePaging('user.list', { serialization: UserListSerialization })
@Get('/list')
async list(@PaginationQuery() query: PaginationDto): Promise<IResponsePaging> {
    const { data, total } = await this.userService.findAll(query);
    return { data, _pagination: { total, ...query } };
}

// File export response
@ResponseFileExcel({ type: ENUM_FILE_EXCEL_TYPE.XLSX })
@Get('/export')
async export(): Promise<IResponseFileExcel> {
    const data = await this.userService.export();
    return { data };
}
```

### 6. Error Handling

Use built-in exception filters and custom exceptions:

```typescript
// Throw HTTP exceptions with proper status codes
throw new BadRequestException("Invalid input");
throw new UnauthorizedException("Invalid credentials");
throw new ForbiddenException("Insufficient permissions");
throw new NotFoundException("User not found");

// Validation exceptions are handled automatically
// File import exceptions use FileImportException
```

All errors return standardized responses with:

- HTTP status code
- Localized error message (based on `x-custom-lang` header)
- Timestamp and metadata
- Detailed validation errors (for validation failures)

### 7. Internationalization (i18n)

Use the message service for all user-facing strings:

```typescript
@Injectable()
export class SomeService {
  constructor(private readonly messageService: MessageService) {}

  async someMethod() {
    const message = await this.messageService.get("user.create.success");
    // Message is automatically localized based on request language
  }
}
```

Language files are in `src/languages/{language}/` with paths matching message keys.

### 8. Authentication & Authorization

#### JWT Authentication

```typescript
// Access token payload includes: user, email, session, role, type, loginDate, loginFrom
// Refresh token payload includes: user, session, loginDate, loginFrom
// Algorithm: ES512 (ECDSA using P-521 and SHA-512)
```

#### RBAC (Role-Based Access Control)

```typescript
// Role types
export enum ENUM_POLICY_ROLE_TYPE {
    SUPER_ADMIN = 'SUPER_ADMIN',
    ADMIN = 'ADMIN',
    USER = 'USER',
}

// Protect endpoint by role
@PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
@AuthJwtAccessProtected()
@Get('/admin-only')
async adminEndpoint() {}
```

#### Policy-Based Authorization (CASL)

```typescript
// Define abilities in policy service
@PolicyAbilityProtected({
    subject: ENUM_POLICY_SUBJECT.USER,
    action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE]
})
@AuthJwtAccessProtected()
@Get('/users/:id')
async getUser() {}
```

### 9. Database Migrations (MikroORM)

```bash
# Create migration
pnpm db:migrate:create

# Run migrations
pnpm db:migrate:up

# Rollback migration
pnpm db:migrate:down

# Check migration status
pnpm db:migrate:check

# List all migrations
pnpm db:migrate:list

# Fresh database (drop + migrate)
pnpm db:migrate:fresh

# Run seeders
pnpm db:seed
```

### 10. Background Jobs (BullMQ)

Place job processors in the feature module:

```typescript
// In module's processors/ folder
@Processor("email-queue")
export class EmailProcessor {
  @Process("send-email")
  async handleSendEmail(job: Job<EmailDto>) {
    // Process job
  }
}

// In service, add job to queue
await this.emailQueue.add("send-email", emailData, {
  delay: 5000, // Optional delay
  attempts: 3,
  backoff: { type: "exponential", delay: 2000 },
});
```

### 11. File Handling

```typescript
// Upload with validation
@UploadFileSingle()
@Post('/upload')
async upload(@UploadedFile() file: IFile) {
    // File is validated automatically
    // Upload to S3 via AwsS3Service
}

// Multiple files
@UploadFileMultiple()
@Post('/upload-multiple')
async uploadMultiple(@UploadedFiles() files: IFile[]) {}
```

## Frontend Architecture

### React Best Practices

#### 1. Component Structure

```typescript
// Use function components with TypeScript
interface UserCardProps {
  user: User;
  onUpdate?: (user: User) => void;
}

export const UserCard: FC<UserCardProps> = ({ user, onUpdate }) => {
  // Component logic
};
```

#### 2. State Management

```typescript
// Use Jotai for global state
import { atom, useAtom } from "jotai";

export const userAtom = atom<User | null>(null);

// In component
const [user, setUser] = useAtom(userAtom);
```

#### 3. Data Fetching (TanStack Query)

```typescript
import { useQuery, useMutation } from "@tanstack/react-query";

// Fetch data
const { data, isLoading, error } = useQuery({
  queryKey: ["users", userId],
  queryFn: () => apiClient.getUser(userId),
});

// Mutate data
const mutation = useMutation({
  mutationFn: (userData) => apiClient.createUser(userData),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["users"] });
  },
});
```

#### 4. Form Handling (React Hook Form + Zod)

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type FormData = z.infer<typeof schema>;

const MyForm = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: FormData) => {
    // Handle submission
  };
};
```

#### 5. Routing (React Router v7)

```typescript
import { createBrowserRouter } from 'react-router-dom';

const router = createBrowserRouter([
    {
        path: '/',
        element: <Layout />,
        children: [
            { index: true, element: <Home /> },
            { path: 'users', element: <UserList /> },
            { path: 'users/:id', element: <UserDetail /> },
        ],
    },
]);
```

#### 6. Authorization (CASL)

```typescript
import { useAbility } from '@casl/react';
import { AbilityContext } from './providers/ability';

const MyComponent = () => {
    const ability = useAbility(AbilityContext);

    if (ability.can('read', 'User')) {
        return <UserList />;
    }

    return <Forbidden />;
};
```

## Coding Standards

### TypeScript

- Use strict mode: `"strict": true`
- Prefer interfaces over types for object shapes
- Use explicit return types for functions
- Avoid `any` - use `unknown` if type is truly unknown
- Use enums for fixed sets of values

### Naming Conventions

- **Files**: kebab-case (e.g., `user.service.ts`, `user-create.dto.ts`)
- **Classes**: PascalCase with suffix (e.g., `UserService`, `UserEntity`, `UserCreateDto`)
- **Interfaces**: PascalCase with `I` prefix for complex interfaces (e.g., `IResponse`, `IUser`)
- **Enums**: PascalCase with `ENUM_` prefix (e.g., `ENUM_POLICY_ROLE_TYPE`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `DATABASE_CONNECTION_NAME`)
- **Variables/Functions**: camelCase

### Code Organization

- One class per file
- Group related functionality in modules
- Keep functions small and focused (single responsibility)
- Use dependency injection via constructors
- Prefer composition over inheritance

### Import Order

```typescript
// 1. External dependencies
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@mikro-orm/nestjs";

// 2. Internal common modules
import { DatabaseEntity } from "src/common/database/entities/database.entity";
import { MessageService } from "src/common/message/services/message.service";

// 3. Feature modules
import { UserEntity } from "src/modules/user/entities/user.entity";
import { UserRepository } from "src/modules/user/repositories/user.repository";

// 4. Types and interfaces
import type { IResponse } from "src/common/response/interfaces/response.interface";
```

### Comments and Documentation

- Use JSDoc for public APIs
- Add Swagger decorators for API endpoints (`@ApiOperation`, `@ApiResponse`)
- Document complex business logic
- Avoid obvious comments

## Environment Configuration

### Backend Environment Variables

```env
# Application
APP_ENV=development
APP_NAME=eccho-api
APP_HOST=localhost
APP_PORT=3000
APP_LANGUAGE=en

# Database (PostgreSQL)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=eccho
DATABASE_USER=postgres
DATABASE_PASSWORD=password

# JWT (ES512 algorithm)
AUTH_JWT_ACCESS_TOKEN_SECRET_KEY=<path-to-private-key>
AUTH_JWT_ACCESS_TOKEN_PUBLIC_KEY=<path-to-public-key>
AUTH_JWT_REFRESH_TOKEN_SECRET_KEY=<path-to-private-key>
AUTH_JWT_REFRESH_TOKEN_PUBLIC_KEY=<path-to-public-key>

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# AWS
AWS_S3_BUCKET=eccho-bucket
AWS_S3_REGION=us-east-1

# Sentry
SENTRY_DSN=<sentry-dsn>
```

## Testing

### Unit Tests (Jest)

```typescript
describe("UserService", () => {
  let service: UserService;
  let repository: UserRepository;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: UserRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get<UserRepository>(UserRepository);
  });

  it("should create a user", async () => {
    const dto = { email: "test@example.com" };
    const result = await service.create(dto);
    expect(result).toBeDefined();
    expect(repository.create).toHaveBeenCalledWith(dto);
  });
});
```

## Common Patterns

### 1. Pagination

```typescript
@ResponsePaging('user.list')
@Get('/list')
async list(
    @PaginationQuery() { page, perPage, sort, filters }: PaginationListDto
): Promise<IResponsePaging> {
    const { data, total } = await this.userService.findAll({
        page,
        perPage,
        sort,
        filters,
    });

    return {
        data,
        _pagination: {
            total,
            totalPage: Math.ceil(total / perPage),
            currentPage: page,
            perPage,
        },
    };
}
```

### 2. Soft Delete

All entities extend `DatabaseEntity` which includes soft delete support:

```typescript
async softDelete(id: string): Promise<void> {
    const entity = await this.repository.findOne({ id });
    entity.deletedAt = new Date();
    await this.repository.getEntityManager().flush();
}
```

### 3. Audit Logging

Use the activity module to log important actions:

```typescript
await this.activityService.create({
  user: userId,
  action: ENUM_ACTIVITY_ACTION.USER_CREATE,
  subject: ENUM_ACTIVITY_SUBJECT.USER,
  metadata: { userId: newUser.id },
});
```

### 4. React Query Pattern (Frontend)

**Query Key Factory**:

```typescript
import { queryKeysFactory } from "@/libs/query-factory";

const USERS_QUERY_KEY = "users" as const;
export const usersQueryKeys = {
  ...queryKeysFactory(USERS_QUERY_KEY),
  me: (workspace?: string) => [USERS_QUERY_KEY, "me", workspace],
};
```

**Query Options**:

```typescript
export const meQueryOptions = (workspace?: string) =>
  queryOptions({
    queryKey: usersQueryKeys.me(workspace),
    queryFn: () =>
      workspace
        ? workspaceControllerProfileV1({ path: { workspace } })
        : userSharedControllerProfileV1(),
    staleTime: 0,
  });
```

**Custom Hook**:

```typescript
export function useMe() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const { data, ...rest } = useQuery(meQueryOptions(workspaceSlug));

  const user = (data?.data as unknown as Response)?.data as UserDto;

  return { ...rest, data, user };
}
```

### 5. Form Pattern (Frontend)

Always use Form components from `@repo/ui`:

```typescript
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { Form, Input } from "@repo/ui/common-components";
import { z } from "zod/v4";

const schema = z.object({
    email: z.email(),
    password: z.string().min(8),
});

const form = useForm({
    resolver: standardSchemaResolver(schema),
});

return (
    <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
            <Form.Field
                control={form.control}
                name="email"
                render={({ field, fieldState }) => (
                    <Form.Item>
                        <Form.Control>
                            <Input
                                errorMessage={fieldState.error?.message}
                                {...field}
                            />
                        </Form.Control>
                    </Form.Item>
                )}
            />
        </form>
    </Form>
);
```

## Monorepo Commands

```bash
# Development
pnpm dev                          # Start all apps in dev mode
pnpm --filter api dev             # Start only API
pnpm --filter app dev             # Start only app

# Build
pnpm build                        # Build all apps
pnpm --filter api build           # Build only API

# Database
pnpm db:migrate:create            # Create migration
pnpm db:migrate:up                # Run migrations
pnpm db:seed                      # Run seeders

# API Client Generation
pnpm generate:client              # Generate TypeScript client from OpenAPI spec

# Linting & Formatting
pnpm lint                         # Lint all packages
pnpm format                       # Format code with Prettier
```

## Security Best Practices

1. **Never commit secrets** - Use environment variables
2. **Validate all inputs** - Use DTOs with class-validator
3. **Use parameterized queries** - MikroORM handles this automatically
4. **Enable CORS properly** - Configure allowed origins
5. **Use helmet** - Already configured in middleware
6. **Rate limiting** - Use @nestjs/throttler (already configured)
7. **Hash passwords** - Use bcryptjs (never store plain text)
8. **Validate JWT tokens** - Always use `@AuthJwtAccessProtected()`
9. **Check permissions** - Use CASL abilities and RBAC
10. **Sanitize outputs** - Use serialization DTOs

## Performance Guidelines

1. **Use pagination** - Never return unbounded lists
2. **Optimize database queries** - Use proper indexes, avoid N+1 queries
3. **Cache responses** - Use Redis caching where appropriate
4. **Background jobs** - Use BullMQ for heavy operations
5. **Connection pooling** - MikroORM handles this automatically
6. **Lazy loading** - Load related entities only when needed
7. **Compression** - Already enabled via middleware

## API Documentation

- API documentation is auto-generated using Swagger/OpenAPI
- Access at: `http://localhost:3000/docs` (development only)
- Use decorators: `@ApiOperation()`, `@ApiResponse()`, `@ApiProperty()`
- Keep documentation up-to-date with code changes

## Git Workflow

1. Create feature branch: `git checkout -b feature/feature-name`
2. Make changes and commit: `git commit -m "feat: description"`
3. Run linting: `pnpm lint`
4. Run tests: `pnpm test` (if applicable)
5. Push and create PR: `git push origin feature/feature-name`

### Commit Message Convention

Follow conventional commits:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting)
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `test:` - Adding tests
- `chore:` - Maintenance tasks

## When in Doubt

1. **Check existing code** - Look for similar implementations in the codebase
2. **Read the docs** - Comprehensive documentation in `apps/api/docs/`
3. **Follow patterns** - Maintain consistency with existing code structure
4. **Ask questions** - Don't make assumptions about business logic
5. **Test your changes** - Ensure your code works before committing

Remember: **Consistency, type safety, and clean architecture are paramount.**
