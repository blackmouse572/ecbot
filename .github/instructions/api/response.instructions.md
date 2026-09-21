---
applyTo: "apps/api/**/*.ts"
description: "Response handling, request validation, error handling, and API documentation patterns"
---

# Response & Validation Instructions

## Response Handling

### Standard Response

Use the `@Response()` decorator for all standard endpoints:

```typescript
@Response('user.get', { serialization: UserGetSerialization })
@Get('/:user')
async get(@GetUser() user: UserEntity): Promise<IResponse> {
    return { data: user };
}
```

Response structure:

```typescript
{
    statusCode: number;
    message: string;
    _metadata: {
        language: string;
        timestamp: number;
        timezone: string;
        path: string;
        version: string;
        repoVersion: string;
    };
    data?: any;
}
```

### Pagination Response

Use `@ResponsePaging()` for list endpoints:

```typescript
@ResponsePaging('user.list', { serialization: UserListSerialization })
@Get('/list')
async list(
    @PaginationQuery() query: PaginationListDto
): Promise<IResponsePaging> {
    const { data, total } = await this.userService.findAll(query);

    return {
        data,
        _pagination: {
            total,
            totalPage: Math.ceil(total / query.perPage),
            currentPage: query.page,
            perPage: query.perPage,
        },
    };
}
```

### File Export Response

Use `@ResponseFileExcel()` for file exports:

```typescript
@ResponseFileExcel({ type: ENUM_FILE_EXCEL_TYPE.XLSX })
@Get('/export')
async export(): Promise<IResponseFileExcel> {
    const data = await this.userService.exportToExcel();
    return { data };
}

// For CSV
@ResponseFileExcel({ type: ENUM_FILE_EXCEL_TYPE.CSV })
@Get('/export/csv')
async exportCsv(): Promise<IResponseFileExcel> {
    const data = await this.userService.exportToCsv();
    return { data };
}
```

## Request Validation

### DTOs with class-validator

All request DTOs must use class-validator decorators:

```typescript
import { IsEmail, IsString, MinLength, IsOptional } from "class-validator";
import { Type } from "class-transformer";

export class UserCreateDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(3)
  username: string;

  @IsPassword() // Custom validator
  password: string;

  @IsOptional()
  @IsString()
  firstName?: string;
}
```

### Custom Validators

Use custom validators from `src/common/request/validations/`:

```typescript
// Password strength
@IsPassword()
password: string;

// Custom email validation
@IsCustomEmail()
email: string;

// Date comparisons
@DateGreaterThan('startDate')
endDate: Date;

@DateLessThanEqual('maxDate')
date: Date;

// Property comparisons
@GreaterThanOtherProperty('minPrice')
maxPrice: number;

@LessThanEqualOtherProperty('maxCount')
count: number;
```

### Pagination Query

`@PaginationQuery()` covers **paging, ordering and search only** — it does not carry
filters. Every filter is its own `@PaginationQueryFilter*` decorator returning a
`find` fragment you spread. Never accept a list filter with a raw `@Query()`.

```typescript
@Get('/list')
async list(
    @PaginationQuery({ availableSearch: ['name', 'email'] })
    { _search, _limit, _offset, _order }: PaginationListDto,
    @PaginationQueryFilterEqual('chatbot') chatbot: Record<string, any>,
    @PaginationQueryFilterInEnum('status', undefined, ENUM_X_STATUS)
    status: Record<string, any>
) {
    const find = { ..._search, ...chatbot, ...status };
}
```

Full decorator list and options: [pagination.md](../../../apps/api/docs/pagination.md).

### Request Timeout

Set custom timeout for specific endpoints:

```typescript
@RequestTimeout(60000) // 60 seconds
@Post('/long-operation')
async longOperation() {
    // Long-running operation
}
```

## Error Handling

### HTTP Exceptions

Use built-in NestJS exceptions:

```typescript
// 400 Bad Request
throw new BadRequestException("Invalid input");

// 401 Unauthorized
throw new UnauthorizedException("Invalid credentials");

// 403 Forbidden
throw new ForbiddenException("Insufficient permissions");

// 404 Not Found
throw new NotFoundException("User not found");

// 409 Conflict
throw new ConflictException("Email already exists");

// 422 Unprocessable Entity
throw new UnprocessableEntityException("Validation failed");

// 500 Internal Server Error
throw new InternalServerErrorException("Something went wrong");
```

### Validation Exceptions

Validation errors are automatically handled by `AppValidationFilter`:

```typescript
// Thrown automatically by class-validator
// Returns detailed field-level errors
{
    statusCode: 422,
    message: 'Validation error',
    errors: [
        {
            property: 'email',
            constraints: {
                isEmail: 'email must be an email'
            }
        }
    ]
}
```

### Custom Error Messages

Use message service for localized errors:

```typescript
const message = await this.messageService.get("user.error.notFound");
throw new NotFoundException(message);
```

## Internationalization (i18n)

### Using Message Service

```typescript
@Injectable()
export class SomeService {
  constructor(private readonly messageService: MessageService) {}

  async someMethod() {
    const message = await this.messageService.get("user.create.success");
    // Message is automatically localized based on x-custom-lang header
  }
}
```

### Message Keys

Message keys follow the pattern: `[module].[action].[status]`

Examples:

- `user.create.success`
- `user.get.error.notFound`
- `auth.login.error.invalidCredentials`

### Language Files

Located in `src/languages/{language}/`:

```
languages/
├── en/
│   ├── user.json
│   ├── auth.json
│   └── ...
└── vi/
    ├── user.json
    ├── auth.json
    └── ...
```

## Serialization

### Response Serialization

Define serialization DTOs to control what data is returned:

```typescript
export class UserGetSerialization {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  username: string;

  // Password is excluded

  @ApiProperty()
  createdAt: Date;
}
```

Use with `@Response()` decorator:

```typescript
@Response('user.get', { serialization: UserGetSerialization })
@Get('/:user')
async get(@GetUser() user: UserEntity): Promise<IResponse> {
    return { data: user }; // Only serialized fields are returned
}
```

## API Documentation (Swagger)

### Swagger Decorator Pattern

**CRITICAL**: Every controller endpoint MUST have a Swagger documentation decorator defined in the `docs/` folder.

### Documentation File Structure

Create a separate documentation file in the module's `docs/` folder:

```typescript
// modules/user/docs/user.admin.doc.ts
import { HttpStatus, applyDecorators } from "@nestjs/common";
import { DatabaseIdResponseDto } from "src/common/database/dtos/response/database.id.response.dto";
import {
  Doc,
  DocAuth,
  DocRequest,
  DocGuard,
  DocResponse,
  DocResponsePaging,
} from "src/common/doc/decorators/doc.decorator";
import { ENUM_DOC_REQUEST_BODY_TYPE } from "src/common/doc/enums/doc.enum";
import {
  UserDocParamsId,
  UserDocQueryCountry,
  UserDocQueryRoleType,
  UserDocQueryStatus,
} from "src/modules/user/constants/user.doc.constant";
import { UserCreateRequestDto } from "src/modules/user/dtos/request/user.create.request.dto";
import { UserListResponseDto } from "src/modules/user/dtos/response/user.list.response.dto";
import { UserProfileResponseDto } from "src/modules/user/dtos/response/user.profile.response.dto";

export function UserAdminListDoc(): MethodDecorator {
  return applyDecorators(
    Doc({
      summary: "get all users",
    }),
    DocRequest({
      queries: [
        ...UserDocQueryStatus,
        ...UserDocQueryRoleType,
        ...UserDocQueryCountry,
      ],
    }),
    DocAuth({
      xApiKey: true,
      jwtAccessToken: true,
    }),
    DocGuard({ role: true, policy: true }),
    DocResponsePaging<UserListResponseDto>("user.list", {
      dto: UserListResponseDto,
    }),
  );
}

export function UserAdminGetDoc(): MethodDecorator {
  return applyDecorators(
    Doc({
      summary: "get detail an user",
    }),
    DocRequest({
      params: UserDocParamsId,
    }),
    DocAuth({
      xApiKey: true,
      jwtAccessToken: true,
    }),
    DocGuard({ role: true, policy: true }),
    DocResponse<UserProfileResponseDto>("user.get", {
      dto: UserProfileResponseDto,
    }),
  );
}

export function UserAdminCreateDoc(): MethodDecorator {
  return applyDecorators(
    Doc({
      summary: "create a user",
    }),
    DocAuth({
      xApiKey: true,
      jwtAccessToken: true,
    }),
    DocRequest({
      bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
      dto: UserCreateRequestDto,
    }),
    DocGuard({ role: true, policy: true }),
    DocResponse<DatabaseIdResponseDto>("user.create", {
      httpStatus: HttpStatus.CREATED,
      dto: DatabaseIdResponseDto,
    }),
  );
}
```

### Using Documentation Decorators in Controllers

Always apply the documentation decorator FIRST (top of the decorator stack):

```typescript
import {
    UserAdminListDoc,
    UserAdminGetDoc,
    UserAdminCreateDoc,
} from 'src/modules/user/docs/user.admin.doc';

@ApiTags('modules.admin.user')
@Controller({
    version: '1',
    path: '/user',
})
export class UserAdminController {
    @UserAdminListDoc()                    // Documentation decorator (FIRST)
    @ResponsePaging('user.list')
    @PolicyAbilityProtected({...})
    @PolicyRoleProtected(...)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list() {}

    @UserAdminGetDoc()                     // Documentation decorator (FIRST)
    @Response('user.get')
    @PolicyAbilityProtected({...})
    @PolicyRoleProtected(...)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/get/:user')
    async get() {}

    @UserAdminCreateDoc()                  // Documentation decorator (FIRST)
    @Response('user.create')
    @PolicyAbilityProtected({...})
    @PolicyRoleProtected(...)
    @UserProtected()
    @AuthJwtAccessProtected()
    @Post('/create')
    async create() {}
}
```

### Documentation Decorator Components

#### Doc Decorator

```typescript
Doc({
  summary: "Brief endpoint description",
  description: "Optional detailed description",
});
```

#### DocAuth Decorator

```typescript
DocAuth({
  xApiKey: true, // Requires API key
  jwtAccessToken: true, // Requires JWT access token
});
```

#### DocGuard Decorator

```typescript
DocGuard({
  role: true, // Role-based guard enabled
  policy: true, // Policy-based guard enabled
});
```

#### DocRequest Decorator

```typescript
// For query parameters
DocRequest({
  queries: [...UserDocQueryStatus, ...UserDocQueryRoleType],
});

// For path parameters
DocRequest({
  params: UserDocParamsId,
});

// For request body
DocRequest({
  bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
  dto: UserCreateRequestDto,
});
```

#### DocResponse Decorator

```typescript
// Standard response
DocResponse<UserProfileResponseDto>("user.get", {
  dto: UserProfileResponseDto,
});

// Created response
DocResponse<DatabaseIdResponseDto>("user.create", {
  httpStatus: HttpStatus.CREATED,
  dto: DatabaseIdResponseDto,
});
```

#### DocResponsePaging Decorator

```typescript
DocResponsePaging<UserListResponseDto>("user.list", {
  dto: UserListResponseDto,
});
```

### Documentation File Naming Convention

```
modules/[feature]/docs/
├── [feature].admin.doc.ts      # Admin controller documentation
├── [feature].user.doc.ts       # User controller documentation
├── [feature].public.doc.ts     # Public controller documentation
├── [feature].shared.doc.ts     # Shared controller documentation
└── [feature].workspace.doc.ts  # Workspace controller documentation
```

### Controller Documentation Tags

Always add `@ApiTags` to controllers:

```typescript
@ApiTags('modules.admin.user')           // Admin endpoints
@ApiTags('modules.user.user')            // User endpoints
@ApiTags('modules.public.auth')          # Public endpoints
@Controller({ version: '1', path: '/user' })
export class UserAdminController {}
```

### Best Practices

1. **One doc file per controller** - Create separate doc files for admin, user, public controllers
2. **Doc decorator first** - Always place documentation decorator at the top
3. **Use Doc helpers** - Use Doc, DocAuth, DocGuard, DocRequest, DocResponse helpers
4. **Type responses** - Always specify response DTO types
5. **Document auth requirements** - Specify xApiKey and jwtAccessToken needs
6. **Document guards** - Indicate role and policy guard requirements
7. **Export from docs folder** - Keep all documentation decorators in module's docs/ folder
8. **Consistent naming** - Follow `[Feature][Controller][Action]Doc` naming pattern

## Response Caching

Enable caching for specific endpoints:

```typescript
@Response('user.list', {
    serialization: UserListSerialization,
    cache: {
        ttl: 300, // 5 minutes
        key: 'user-list',
    },
})
@Get('/list')
async list() {}
```

## File Upload Validation

```typescript
@UploadFileSingle()
@Post('/upload')
async upload(@UploadedFile() file: IFile) {
    // File is automatically validated
    // - Max size
    // - Allowed mime types
    // - File extension
}

@UploadFileMultiple()
@Post('/upload-multiple')
async uploadMultiple(@UploadedFiles() files: IFile[]) {
    // Multiple files validated
}
```

## Best Practices

1. **Always use DTOs** - Never accept raw objects
2. **Validate all inputs** - Use class-validator decorators
3. **Serialize responses** - Control what data is exposed
4. **Standardize responses** - Use response decorators
5. **Localize messages** - Use message service
6. **Document endpoints** - Use Swagger decorators
7. **Handle errors properly** - Use appropriate HTTP exceptions
8. **Cache when appropriate** - Use response caching for expensive operations
9. **Set timeouts** - For long-running operations
10. **Paginate lists** - Never return unbounded data
