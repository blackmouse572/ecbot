---
applyTo: "apps/api/**/*.ts"
description: "NestJS API architecture patterns, module structure, and organization guidelines"
---

# API Architecture Instructions

## Module Structure

Follow the standard NestJS module structure with clear separation of concerns:

```
modules/[feature]/
├── controllers/           # Request handlers (admin, user, system, public, shared, workspace)
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

## Controller Organization

Controllers are organized by access level with specific naming conventions:

- `*.admin.controller.ts` - Admin operations (requires ADMIN or SUPER_ADMIN role)
- `*.user.controller.ts` - Authenticated user operations
- `*.public.controller.ts` - Unauthenticated public access
- `*.system.controller.ts` - System/internal operations
- `*.shared.controller.ts` - Multi-role endpoints
- `*.workspace.controller.ts` - Workspace-specific operations

### Controller Example

```typescript
@Controller({
  version: "1",
  path: "/user",
})
export class UserAdminController {
  constructor(private readonly userService: UserService) {}

  @Response("user.get", { serialization: UserGetSerialization })
  @PolicyAbilityProtected({
    subject: ENUM_POLICY_SUBJECT.USER,
    action: [ENUM_POLICY_ACTION.READ],
  })
  @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
  @AuthJwtAccessProtected()
  @Get("/:user")
  async get(@GetUser() user: UserEntity): Promise<IResponse> {
    return { data: user };
  }
}
```

## Service Layer

Services contain business logic and coordinate between repositories:

```typescript
@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly sessionService: SessionService,
    private readonly messageService: MessageService,
  ) {}

  async findOneById(id: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({ id });
  }

  async create(dto: UserCreateDto): Promise<UserEntity> {
    const user = this.userRepository.create(dto);
    await this.userRepository.getEntityManager().persistAndFlush(user);
    return user;
  }
}
```

## Dependency Injection

Always use constructor-based dependency injection:

```typescript
@Injectable()
export class SomeService {
  constructor(
    private readonly repository: SomeRepository,
    private readonly helperService: HelperService,
  ) {}
}
```

## Code Organization Principles

1. **One class per file** - Keep files focused and maintainable
2. **Single Responsibility** - Each class/function should have one clear purpose
3. **Dependency Injection** - Use NestJS DI container for all dependencies
4. **Repository Pattern** - All database access through repositories
5. **DTOs for Data Transfer** - Use DTOs for request/response validation
6. **Interfaces for Contracts** - Define clear interfaces for complex types

## Import Order

Organize imports in this order:

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

## Common Module Patterns

### Module Definition

```typescript
@Module({
  imports: [MikroOrmModule.forFeature([UserEntity])],
  providers: [UserService, UserRepository],
  exports: [UserService],
  controllers: [],
})
export class UserModule {}
```

### Dynamic Module

```typescript
@Module({})
export class SomeModule {
  static forRoot(): DynamicModule {
    return {
      module: SomeModule,
      providers: [SomeService],
      exports: [SomeService],
    };
  }
}
```

## File Naming Conventions

- **Entities**: `[name].entity.ts` (e.g., `user.entity.ts`)
- **Services**: `[name].service.ts` (e.g., `user.service.ts`)
- **Controllers**: `[name].[type].controller.ts` (e.g., `user.admin.controller.ts`)
- **Repositories**: `[name].repository.ts` (e.g., `user.repository.ts`)
- **DTOs**: `[name].[action].dto.ts` (e.g., `user.create.dto.ts`)
- **Interfaces**: `[name].interface.ts` (e.g., `user.interface.ts`)
- **Enums**: `[name].enum.ts` (e.g., `user-status.enum.ts`)
- **Guards**: `[name].guard.ts` (e.g., `user.guard.ts`)
- **Decorators**: `[name].decorator.ts` (e.g., `get-user.decorator.ts`)
