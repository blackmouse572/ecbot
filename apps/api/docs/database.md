# Overview

The database architecture in ACK NestJS Boilerplate follows a clean repository pattern that provides a clear separation between business logic and data access layers. The architecture is built on PostgreSQL using MikroORM as the Object Relational Mapping (ORM) library, offering a robust, type-safe approach to database operations with excellent TypeScript support.

This documentation explains the features and usage of:

- **Database Core**: Located at `src/common/database`
- **MikroORM Integration**: PostgreSQL with MikroORM for modern ORM capabilities
- **Entity-Repository Pattern**: Clean architecture with type-safe database operations

The database functionality is organized into several key components:

1. **Database Module** - Global module providing database services
2. **Repository Pattern** - Implementation using MikroORM's EntityRepository
3. **Entity Definitions** - PostgreSQL table representations with MikroORM decorators
4. **Migration System** - Database schema versioning with MikroORM CLI
5. **Seeding System** - Initial data population using MikroORM seeders

# Table of Contents

- [Overview](#overview)
- [Table of Contents](#table-of-contents)
    - [Modules](#modules)
    - [Services](#services)
        - [DatabaseOptionService](#databaseoptionservice)
        - [DatabaseService](#databaseservice)
    - [Repository](#repository)
        - [Base Repository Class](#base-repository-class)
            - [Soft Delete Implementation](#soft-delete-implementation)
        - [Entity Base Class](#entity-base-class)
    - [Structure](#structure)
    - [Example](#example)
        - [Entity](#entity)
        - [Repository](#repository-1)
        - [Repository Module Example](#repository-module-example)
        - [Service](#service)

## Modules

The database architecture uses two primary modules:

1. **DatabaseOptionModule**: Provides configuration for PostgreSQL connections.
2. **DatabaseModule**: Global module that provides database services throughout the application.

```typescript
@Module({
    providers: [DatabaseOptionService],
    exports: [DatabaseOptionService],
    imports: [],
    controllers: [],
})
export class DatabaseOptionModule {}

@Global()
@Module({})
export class DatabaseModule {
    static forRoot(): DynamicModule {
        return {
            module: DatabaseModule,
            providers: [DatabaseService],
            exports: [DatabaseService],
            imports: [],
            controllers: [],
        };
    }
}
```

The CommonModule integrates the MikroORM database system:

```typescript
@Module({
    imports: [
        // PostgreSQL with MikroORM
        MikroOrmModule.forRootAsync({
            imports: [DatabaseOptionModule],
            contextName: DATABASE_CONNECTION_NAME,
            inject: [DatabaseOptionService],
            useFactory: (databaseService: DatabaseOptionService) =>
                databaseService.createMikroOrmOptions(),
        }),
        // ... other modules
    ],
})
export class CommonModule {}
```

## Services

### DatabaseOptionService

The `DatabaseOptionService` configures PostgreSQL connection parameters with MikroORM, handling environment variables and connection optimization:

```typescript
@Injectable()
export class DatabaseOptionService implements IDatabaseOptionService {
    constructor(private readonly configService: ConfigService) {}

    // PostgreSQL with MikroORM configuration
    createMikroOrmOptions(): MikroOrmModuleOptions<any> {
        const env = this.configService.get<string>('app.env');

        return {
            driver: PostgreSqlDriver,
            host: this.configService.get<string>('database.mikroOrm.host'),
            port: this.configService.get<number>('database.mikroOrm.port'),
            user: this.configService.get<string>('database.mikroOrm.user'),
            password: this.configService.get<string>('database.mikroOrm.pass'),
            dbName: this.configService.get<string>('database.mikroOrm.dbName'),
            debug: env !== ENUM_APP_ENVIRONMENT.PRODUCTION,
            autoLoadEntities: true,
            pool:
                env === ENUM_APP_ENVIRONMENT.MIGRATION
                    ? {
                          max: 20,
                          min: 5,
                          acquireTimeoutMillis: 60000,
                          idleTimeoutMillis: 120000,
                      }
                    : {
                          max: 10,
                          min: 2,
                          acquireTimeoutMillis: 30000,
                          idleTimeoutMillis: 60000,
                      },
        };
    }
}
```

### DatabaseService

The `DatabaseService` provides database functionality with MikroORM's EntityManager for transaction management and advanced operations:

```typescript
@Injectable()
export class DatabaseService implements IDatabaseService {
    constructor(private readonly em: EntityManager) {}

    // MikroORM transaction support
    async executeInTransaction<T>(
        callback: (em: EntityManager) => Promise<T>
    ): Promise<T> {
        return this.em.transactional(callback);
    }

    // Get entity manager for direct operations
    getEntityManager(): EntityManager {
        return this.em;
    }

    // Example transaction usage:
    // await this.databaseService.executeInTransaction(async (em) => {
    //     const user = await em.findOne(UserEntity, { id: userId });
    //     user.email = newEmail;
    //     await em.persistAndFlush(user);
    // });
}
```

## Repository

The repository pattern implementation provides a consistent approach to database operations across all entities using MikroORM's `EntityRepository` which provides type-safe database operations.

### MikroORM Repository Pattern

All entities use MikroORM's `EntityRepository` which provides comprehensive database operations:

```typescript
@Injectable()
export class UserRepository extends EntityRepository<UserEntity> {
    constructor(private readonly em: EntityManager) {
        super(em, UserEntity);
    }

    // Custom repository methods
    async findByEmail(email: string): Promise<UserEntity | null> {
        return this.findOne({ email });
    }

    async findActiveUsers(): Promise<UserEntity[]> {
        return this.find({ deleted: false });
    }

    // Advanced queries using QueryBuilder
    async findUsersWithRoles(): Promise<UserEntity[]> {
        return this.em
            .createQueryBuilder(UserEntity, 'u')
            .leftJoinAndSelect('u.role', 'r')
            .where({ deleted: false })
            .getResult();
    }

    // Transaction example
    async updateUserWithHistory(
        userId: string,
        data: Partial<UserEntity>
    ): Promise<UserEntity> {
        return this.em.transactional(async em => {
            const user = await em.findOneOrFail(UserEntity, userId);
            Object.assign(user, data);
            await em.persistAndFlush(user);
            return user;
        });
    }
}
```

### Repository Operations

MikroORM's EntityRepository provides comprehensive operations out of the box:

#### Query Methods

- `findOne(where, options?)` - Find single entity
- `findOneOrFail(where, options?)` - Find single entity or throw
- `find(where, options?)` - Find multiple entities
- `findAndCount(where, options?)` - Find with total count
- `count(where?)` - Count entities

#### Mutation Methods

- `persist(entity)` - Mark entity for persistence
- `persistAndFlush(entity)` - Persist and flush immediately
- `remove(entity)` - Mark entity for removal
- `removeAndFlush(entity)` - Remove and flush immediately
- `flush()` - Execute all pending operations

#### Advanced Queries

- `createQueryBuilder(alias?)` - Create query builder
- `aggregate(pipeline)` - Run aggregation queries
- `nativeInsert(data)` - Native insert operations
- `nativeUpdate(where, data)` - Native update operations

#### Soft Delete Implementation

The repository implements soft delete functionality where records are marked as deleted but not physically removed from the database. This provides data recoverability and historical preservation when needed.

When querying data:

- By default, soft-deleted records are filtered out (only returns records where `deleted: false`)
- When the `withDeleted` option is set to `true`, both deleted and non-deleted records are returned

Implementation example:

```typescript
async findAll<T = EntityDocument>(
    find?: RootFilterQuery<Entity>,
    options?: IDatabaseFindAllOptions
): Promise<T[]> {
    const repository = this._repository.find<T>({
        ...find,
        ...(!options?.withDeleted && {
            deleted: false,
        }),
    });

    // Additional query operations...

    return repository.exec();
}
```

This pattern is consistently applied across all query methods to ensure proper handling of soft-deleted records.

### Entity Base Class

All database entities inherit from the `DatabaseEntityBase` class, which provides common fields like ID, created/updated timestamps, and soft delete support:

```typescript
// MikroORM base entity
export class DatabaseEntityBase {
    @PrimaryKey({ type: 'uuid' })
    _id: string = v4();

    @Property({ type: 'boolean', default: false })
    @Index()
    deleted: boolean = false;

    @Property({ type: 'datetime' })
    @Index()
    createdAt: Date = new Date();

    @Property({ type: 'datetime', onUpdate: () => new Date() })
    @Index()
    updatedAt: Date = new Date();

    @Property({ type: 'string', nullable: true })
    deletedAt?: Date;

    @Property({ type: 'string', nullable: true })
    createdBy?: string;

    @Property({ type: 'string', nullable: true })
    updatedBy?: string;

    @Property({ type: 'string', nullable: true })
    deletedBy?: string;
}
```

## Structure

Each module in the application follows a consistent repository structure using MikroORM:

```
/modules/{module-name}/
├── repository/
│   ├── entities/
│   │   └── {entity-name}.entity.ts    # MikroORM Entity definition
│   ├── repositories/
│   │   └── {entity-name}.repository.ts # EntityRepository implementation
│   └── {entity-name}.repository.module.ts # Repository module config
```

### MikroORM Structure (PostgreSQL)

- **UserModule**, **RoleModule**, **CountryModule**, **SessionModule** - All modules use this structure
- Uses `@Entity()`, `@Property()`, `@ManyToOne()`, etc. decorators
- Extends `EntityRepository<T>`
- Registered with `MikroOrmModule.forFeature([Entity])`

## Migration Commands

The application includes comprehensive CLI commands for database operations:

### MikroORM Commands (PostgreSQL)

```bash
# From project root
pnpm db:migrate:create       # Create new migration
pnpm db:migrate:up          # Run pending migrations
pnpm db:migrate:down        # Rollback last migration
pnpm db:migrate:list        # List all migrations
pnpm db:migrate:fresh       # Drop and recreate database

pnpm db:schema:create       # Create database schema
pnpm db:schema:drop         # Drop database schema
pnpm db:schema:update       # Update schema to match entities

pnpm db:seed               # Run database seeders
pnpm db:seed:create        # Create new seeder

# From apps/api directory
pnpm migration:create       # Same commands without 'db:' prefix
pnpm seeder:run
```

## Example

### Entity

Entity definitions use MikroORM decorators for PostgreSQL tables. Each entity defines the data structure with proper relationships and indexes:

```typescript
@Entity({ tableName: 'Users' })
export class UserEntity extends DatabaseEntityBase {
    @Property({ type: 'string', length: 100 })
    @Index()
    @Unique()
    email: string;

    @Property({ type: 'string', length: 50 })
    firstName: string;

    @Property({ type: 'string', length: 50 })
    lastName: string;

    @ManyToOne(() => RoleEntity)
    role: RoleEntity;

    @ManyToOne(() => CountryEntity)
    country: CountryEntity;

    @Embedded(() => UserMobileNumberEntity)
    mobileNumber?: UserMobileNumberEntity;

    @Embedded(() => UserVerificationEntity)
    verification?: UserVerificationEntity;

    @Property({ type: 'string', nullable: true })
    avatar?: string;
}
```

### Repository

Each repository extends MikroORM's EntityRepository and can customize functionality as needed. The repository handles all data operations for a specific entity:

```typescript
@Injectable()
export class UserRepository extends EntityRepository<UserEntity> {
    constructor(private readonly em: EntityManager) {
        super(em, UserEntity);
    }

    // Custom repository methods
    async findByEmail(email: string): Promise<UserEntity | null> {
        return this.findOne({ email });
    }

    async findActiveUsers(): Promise<UserEntity[]> {
        return this.find({ deleted: false });
    }

    // Advanced queries using QueryBuilder
    async findUsersWithRoles(): Promise<UserEntity[]> {
        return this.em
            .createQueryBuilder(UserEntity, 'u')
            .leftJoinAndSelect('u.role', 'r')
            .where({ deleted: false })
            .getResult();
    }
}
```

Repositories provide a clean abstraction over PostgreSQL and enable:

- Complete CRUD operations on entities
- Type-safe database operations
- Advanced query building
- Transaction support
- Relationship management

### Repository Module Example

Each repository has its own module to handle dependencies and exports. This module facilitates dependency injection and NestJS integration:

```typescript
@Module({
    providers: [UserRepository],
    exports: [UserRepository],
    controllers: [],
    imports: [
        // Register entity with MikroORM
        MikroOrmModule.forFeature([UserEntity]),
    ],
})
export class UserRepositoryModule {}
```

### Service

Services use repositories for data access, implementing business logic on top of the repository layer. The service layer bridges controllers and the data access layer:

```typescript
@Injectable()
export class UserService implements IUserService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly em: EntityManager,
        // Other dependencies...
        private readonly configService: ConfigService
    ) {}

    // Service method implementations
    async findAll(
        where?: FilterQuery<UserEntity>,
        options?: FindOptions<UserEntity>
    ): Promise<UserEntity[]> {
        return this.userRepository.find(where, options);
    }

    async findOne(id: string): Promise<UserEntity | null> {
        return this.userRepository.findOne({ _id: id });
    }

    async create(data: Partial<UserEntity>): Promise<UserEntity> {
        const user = this.userRepository.create(data);
        await this.em.persistAndFlush(user);
        return user;
    }

    // Soft delete a record
    async softDelete(id: string): Promise<UserEntity> {
        const user = await this.userRepository.findOneOrFail({ _id: id });
        user.deleted = true;
        user.deletedAt = new Date();
        await this.em.flush();
        return user;
    }

    // Restore a soft-deleted record
    async restore(id: string): Promise<UserEntity> {
        const user = await this.userRepository.findOneOrFail({ _id: id });
        user.deleted = false;
        user.deletedAt = null;
        await this.em.flush();
        return user;
    }

    // Transaction example
    async updateUserProfile(
        id: string,
        profileData: Partial<UserEntity>
    ): Promise<UserEntity> {
        return this.em.transactional(async em => {
            const user = await em.findOneOrFail(UserEntity, id);
            Object.assign(user, profileData);
            await em.flush();
            return user;
        });
    }
}
```
