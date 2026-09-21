---
applyTo: "packages/auth/**/*.ts"
description: "Shared authentication utilities and helpers"
---

# Auth Package Instructions

## Overview

The auth package provides shared authentication utilities used across frontend applications.

## Features

- JWT token management
- Auth state handling
- Token storage (cookies)
- API client authentication
- Permission helpers

## Token Management

```typescript
export class TokenManager {
  private static readonly ACCESS_TOKEN_KEY = "access_token";
  private static readonly REFRESH_TOKEN_KEY = "refresh_token";

  static setAccessToken(token: string): void {
    Cookies.set(this.ACCESS_TOKEN_KEY, token, {
      secure: true,
      sameSite: "strict",
    });
  }

  static getAccessToken(): string | undefined {
    return Cookies.get(this.ACCESS_TOKEN_KEY);
  }

  static removeTokens(): void {
    Cookies.remove(this.ACCESS_TOKEN_KEY);
    Cookies.remove(this.REFRESH_TOKEN_KEY);
  }
}
```

## Auth Helpers

```typescript
export const isAuthenticated = (): boolean => {
  const token = TokenManager.getAccessToken();
  if (!token) return false;

  try {
    const payload = decodeJWT(token);
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
};

export const decodeJWT = (token: string): JWTPayload => {
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split("")
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join(""),
  );

  return JSON.parse(jsonPayload);
};
```

## Permission Utilities

```typescript
export const hasPermission = (
  userPermissions: Permission[],
  requiredAction: string,
  requiredSubject: string,
): boolean => {
  return userPermissions.some(
    (p) => p.action === requiredAction && p.subject === requiredSubject,
  );
};

export const hasRole = (userRole: string, requiredRoles: string[]): boolean => {
  return requiredRoles.includes(userRole);
};
```

## Best Practices

1. **Secure storage** - Use httpOnly cookies when possible
2. **Token refresh** - Implement automatic token refresh
3. **Expiration check** - Always validate token expiration
4. **Type safety** - Define types for all auth-related data
5. **Error handling** - Handle auth errors gracefully
