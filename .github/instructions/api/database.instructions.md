---
applyTo: "apps/api/**/*.ts"
description: "PostgreSQL database patterns using MikroORM including repositories, entities, and migrations"
---

# Database Instructions

## Technology Stack

- **Database**: PostgreSQL
- **ORM**: MikroORM v6.5.4
- **Connection**: Configured via `DatabaseOptionService`
- **Migrations**: MikroORM CLI
- **Seeding**: MikroORM seeders

## Repository Pattern

Always use the Repository pattern for database access:

### Entity Definition

Entity files must live under `src/common/` or `src/modules/` — the MikroORM CLI (`mikro-orm.config.ts`) globs only those two roots, so an entity elsewhere loads at runtime via `autoLoadEntities` but is invisible to `migration:create`.

```typescript
import { Entity, Property } from "@mikro-orm/core";
import { DatabaseEntity } from "src/common/database/entities/database.entity";

@Entity({ tableName: "users" })
export class UserEntity extends DatabaseEntity {
  @Property()
  email: string;

  @Property()
  username: string;

  @Property({ hidden: true }) // Hide from serialization
  password: string;

  @Property({ type: "timestamp", onCreate: () => new Date() })
  createdAt: Date;

  @Property({ type: "timestamp", onUpdate: () => new Date() })
  updatedAt: Date;

  @Property({ type: "timestamp", nullable: true })
  deletedAt?: Date; // Soft delete
}
```

### Repository Definition

```typescript
import { EntityRepository } from "@mikro-orm/postgresql";
import { Injectable } from "@nestjs/common";
import { UserEntity } from "../entities/user.entity";

@Injectable()
export class UserRepository extends EntityRepository<UserEntity> {
  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.findOne({ email, deletedAt: null });
  }

  async findActiveUsers(): Promise<UserEntity[]> {
    return this.find({
      deletedAt: null,
      isActive: true,
    });
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.count({ email, deletedAt: null });
    return count > 0;
  }
}
```

### Service Using Repository

```typescript
@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async create(dto: UserCreateDto): Promise<UserEntity> {
    const user = this.userRepository.create(dto);
    await this.userRepository.getEntityManager().persistAndFlush(user);
    return user;
  }

  async update(id: string, dto: UserUpdateDto): Promise<UserEntity> {
    const user = await this.userRepository.findOneOrFail({ id });
    this.userRepository.assign(user, dto);
    await this.userRepository.getEntityManager().flush();
    return user;
  }

  async softDelete(id: string): Promise<void> {
    const user = await this.userRepository.findOneOrFail({ id });
    user.deletedAt = new Date();
    await this.userRepository.getEntityManager().flush();
  }
}
```

## Entity Relationships

### One-to-Many

```typescript
@Entity({ tableName: "users" })
export class UserEntity extends DatabaseEntity {
  @OneToMany(() => SessionEntity, (session) => session.user)
  sessions = new Collection<SessionEntity>(this);
}

@Entity({ tableName: "sessions" })
export class SessionEntity extends DatabaseEntity {
  @ManyToOne(() => UserEntity)
  user: UserEntity;
}
```

### Many-to-One

```typescript
@Entity({ tableName: "posts" })
export class PostEntity extends DatabaseEntity {
  @ManyToOne(() => UserEntity)
  author: UserEntity;
}
```

### Many-to-Many

```typescript
@Entity({ tableName: "users" })
export class UserEntity extends DatabaseEntity {
  @ManyToMany(() => RoleEntity)
  roles = new Collection<RoleEntity>(this);
}
```

## Soft Delete Pattern

All entities extend `DatabaseEntity` which includes soft delete support:

```typescript
export abstract class DatabaseEntity {
  @PrimaryKey({ type: "uuid" })
  id: string = uuid();

  @Property({ type: "timestamp", onCreate: () => new Date() })
  createdAt: Date;

  @Property({ type: "timestamp", onUpdate: () => new Date() })
  updatedAt: Date;

  @Property({ type: "timestamp", nullable: true })
  deletedAt?: Date;
}
```

### Using Soft Delete

```typescript
// Soft delete
async softDelete(id: string): Promise<void> {
    const entity = await this.repository.findOneOrFail({ id });
    entity.deletedAt = new Date();
    await this.repository.getEntityManager().flush();
}

// Query excluding soft-deleted
async findAll(): Promise<Entity[]> {
    return this.repository.find({ deletedAt: null });
}

// Restore soft-deleted
async restore(id: string): Promise<void> {
    const entity = await this.repository.findOneOrFail({ id });
    entity.deletedAt = null;
    await this.repository.getEntityManager().flush();
}
```

## Database Transactions

```typescript
async createUserWithProfile(dto: CreateUserDto): Promise<UserEntity> {
    const em = this.userRepository.getEntityManager();

    return await em.transactional(async (em) => {
        const user = em.create(UserEntity, dto.user);
        await em.persist(user);

        const profile = em.create(ProfileEntity, {
            ...dto.profile,
            user,
        });
        await em.persist(profile);

        await em.flush();
        return user;
    });
}
```

## Pagination

```typescript
async findAll(query: PaginationDto): Promise<{ data: UserEntity[]; total: number }> {
    const [data, total] = await this.userRepository.findAndCount(
        { deletedAt: null },
        {
            limit: query.perPage,
            offset: (query.page - 1) * query.perPage,
            orderBy: { [query.sort]: query.order },
        }
    );

    return { data, total };
}
```

## Query Builders

```typescript
async findUsersWithActiveSession(): Promise<UserEntity[]> {
    const qb = this.userRepository.createQueryBuilder('u');

    return qb
        .leftJoinAndSelect('u.sessions', 's')
        .where({ deletedAt: null })
        .andWhere({ 's.isActive': true })
        .getResultList();
}
```

## Database Migrations

### Create Migration

```bash
pnpm db:migrate:create
```

This creates a new migration file in `migrations/` directory.

### Run Migrations

```bash
pnpm db:migrate:up      # Run pending migrations
pnpm db:migrate:down    # Rollback last migration
pnpm db:migrate:list    # List all migrations
pnpm db:migrate:check   # Check migration status
pnpm db:migrate:fresh   # Drop database and run all migrations
```

### Migration Example

```typescript
import { Migration } from "@mikro-orm/migrations";

export class Migration20231001000000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
            create table "users" (
                "id" uuid not null,
                "email" varchar(255) not null,
                "username" varchar(255) not null,
                "password" varchar(255) not null,
                "created_at" timestamp not null,
                "updated_at" timestamp not null,
                "deleted_at" timestamp null,
                constraint "users_pkey" primary key ("id")
            );
        `);

    this.addSql(`
            create unique index "users_email_unique" 
            on "users" ("email") 
            where "deleted_at" is null;
        `);
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists "users" cascade;');
  }
}
```

## Database Seeding

### Create Seeder

```bash
pnpm db:seed:create
```

### Seeder Example

```typescript
import { Seeder } from "@mikro-orm/seeder";
import { EntityManager } from "@mikro-orm/postgresql";
import { UserEntity } from "../entities/user.entity";

export class UserSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const user = em.create(UserEntity, {
      email: "admin@example.com",
      username: "admin",
      password: await hash("password", 10),
    });

    await em.persist(user);
  }
}
```

### Run Seeders

```bash
pnpm db:seed
```

## Best Practices

1. **Use repositories** - Never access EntityManager directly from controllers
2. **Soft delete by default** - Extend DatabaseEntity for audit trail
3. **Use transactions** - For operations affecting multiple entities
4. **Index frequently queried fields** - Add database indexes
5. **Lazy load relations** - Use `populate` only when needed
6. **Avoid N+1 queries** - Use `leftJoinAndSelect` or `populate`
7. **Use migrations** - Never modify database schema manually
8. **Type safety** - Let MikroORM infer types from entities
9. **Query builders for complex queries** - Use when needed
10. **Test with real database** - Use test database for integration tests
