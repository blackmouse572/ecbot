---
applyTo: "apps/api/**/*.ts"
description: "Authentication and authorization patterns including JWT, RBAC, and CASL policy-based permissions"
---

# Authentication & Authorization Instructions

## JWT Authentication

### JWT Configuration

- **Algorithm**: ES512 (ECDSA using P-521 and SHA-512)
- **Token Types**: Access token (short-lived) and Refresh token (long-lived)
- **Key Storage**: Private/public key pairs stored in `keys/` directory

### JWT Token Payload

**Access Token**:

```typescript
{
  loginDate: Date; // When the user logged in
  loginFrom: string; // Login source (MOBILE, WEB, etc.)
  user: string; // User ID
  email: string; // User email
  session: string; // Session ID
  role: string; // Role ID
  type: string; // Role type (ADMIN, USER, etc.)
  iat: number; // Issued At
  exp: number; // Expiration
  aud: string; // Audience
  iss: string; // Issuer
  sub: string; // Subject (user identifier)
  kid: string; // Key ID
}
```

**Refresh Token**:

```typescript
{
  loginDate: Date;
  loginFrom: string;
  user: string;
  session: string;
  iat: number;
  exp: number;
  aud: string;
  iss: string;
  sub: string;
  kid: string;
}
```

## Protection Decorator Order

**CRITICAL**: When using multiple protection decorators, apply them in this EXACT order (bottom to top):

```typescript
@ExampleDoc()                      // Documentation (top)
@PolicyAbilityProtected({...})     // CASL ability check
@PolicyRoleProtected(...)          // Role-based check
@UserProtected()                   // User existence check
@AuthJwtAccessProtected()          // JWT validation (REQUIRED BASE)
@ApiKeyProtected()                 // API key validation (if needed)
@Get('/endpoint')                  // HTTP method decorator (bottom)
async method() {}
```

**Important**: `@AuthJwtAccessProtected()` is ALWAYS required for protected routes and must be placed before any other protection decorators.

## Role-Based Access Control (RBAC)

### Role Types

```typescript
export enum ENUM_POLICY_ROLE_TYPE {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  USER = "USER",
}
```

### Role Protection

```typescript
// Single role
@PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
@AuthJwtAccessProtected()
@Get('/admin-only')
async adminEndpoint() {}

// Multiple roles
@PolicyRoleProtected(
    ENUM_POLICY_ROLE_TYPE.ADMIN,
    ENUM_POLICY_ROLE_TYPE.SUPER_ADMIN
)
@AuthJwtAccessProtected()
@Get('/admin-or-super')
async adminOrSuperEndpoint() {}
```

## Policy-Based Authorization (CASL)

### Policy Actions

```typescript
export enum ENUM_POLICY_ACTION {
  READ = "READ",
  CREATE = "CREATE",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
  EXPORT = "EXPORT",
  IMPORT = "IMPORT",
}
```

### Policy Subjects

```typescript
export enum ENUM_POLICY_SUBJECT {
  USER = "USER",
  ROLE = "ROLE",
  API_KEY = "API_KEY",
  SETTING = "SETTING",
  // Add more as needed
}
```

### Ability Protection

```typescript
// Single action
@PolicyAbilityProtected({
    subject: ENUM_POLICY_SUBJECT.USER,
    action: [ENUM_POLICY_ACTION.READ]
})
@AuthJwtAccessProtected()
@Get('/users/:id')
async getUser() {}

// Multiple actions
@PolicyAbilityProtected({
    subject: ENUM_POLICY_SUBJECT.USER,
    action: [
        ENUM_POLICY_ACTION.READ,
        ENUM_POLICY_ACTION.UPDATE
    ]
})
@AuthJwtAccessProtected()
@Patch('/users/:id')
async updateUser() {}
```

## User Protection

The `@UserProtected()` decorator ensures the user exists and is active:

```typescript
@UserProtected()
@AuthJwtAccessProtected()
@Get('/profile')
async getProfile(@GetUser() user: UserEntity) {
    return { data: user };
}
```

## Combined Protection Example

```typescript
@UserGetDoc()                          // API documentation
@Response('user.get', {
    serialization: UserGetSerialization
})
@PolicyAbilityProtected({              // Check CASL abilities
    subject: ENUM_POLICY_SUBJECT.USER,
    action: [ENUM_POLICY_ACTION.READ]
})
@PolicyRoleProtected(                   // Check role
    ENUM_POLICY_ROLE_TYPE.ADMIN,
    ENUM_POLICY_ROLE_TYPE.SUPER_ADMIN
)
@UserProtected()                        // Verify user exists
@AuthJwtAccessProtected()               // Validate JWT (required)
@Get('/:user')
async get(@GetUser() user: UserEntity): Promise<IResponse> {
    return { data: user };
}
```

## Session Management

Sessions are tracked in Redis and linked to JWT tokens:

```typescript
// Create session
const session = await this.sessionService.create({
    user: userId,
    loginDate: new Date(),
    loginFrom: ENUM_SESSION_LOGIN_FROM.WEB,
});

// Get current session
@GetSession() session: SessionEntity

// Revoke session
await this.sessionService.revoke(sessionId);
```

## Social Authentication

### Google SSO

```typescript
@Post('/login/google')
async loginGoogle(@Body() dto: AuthGoogleLoginDto) {
    const { accessToken } = await this.authService.loginWithGoogle(dto);
    return { data: { accessToken } };
}
```

### Apple SSO

```typescript
@Post('/login/apple')
async loginApple(@Body() dto: AuthAppleLoginDto) {
    const { accessToken } = await this.authService.loginWithApple(dto);
    return { data: { accessToken } };
}
```

## API Key Authentication

For system-to-system communication:

```typescript
@ApiKeyProtected()
@Get('/system/endpoint')
async systemEndpoint() {
    // Protected by API key
}
```

## Custom Decorators

### Get Authenticated User

```typescript
@GetUser() user: UserEntity
@GetUser('id') userId: string
@GetUser('email') email: string
```

### Get Current Session

```typescript
@GetSession() session: SessionEntity
@GetSession('id') sessionId: string
```

## Security Best Practices

1. **Always validate JWT** - Use `@AuthJwtAccessProtected()` for all protected routes
2. **Layer permissions** - Combine role and ability checks when needed
3. **Check user status** - Use `@UserProtected()` to verify user is active
4. **Revoke sessions** - Implement session revocation for logout
5. **Hash passwords** - Use bcryptjs (never store plain text)
6. **Validate tokens** - Check expiration, signature, and claims
7. **Use secure algorithms** - ES512 for JWT signing
8. **Rotate keys** - Regularly update JWT signing keys
9. **Monitor sessions** - Track active sessions per user
10. **Rate limiting** - Apply throttling to auth endpoints
