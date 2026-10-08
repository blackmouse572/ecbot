# Overview

This document covers the audit functionality, including activity logging and password history tracking.

This documentation explains the features and usage of:

- **Activity Module**: Located at `src/modules/activity`
- **Password History Module**: Located at `src/modules/password-history`

# Table of Contents

- [Overview](#overview)
- [Table of Contents](#table-of-contents)
    - [Activity Module](#activity-module)
        - [Overview](#overview-1)
        - [How to Use](#how-to-use)
    - [Password History Module](#password-history-module)
        - [Overview](#overview-2)
        - [How to Use](#how-to-use-1)

## Activity Module

### Overview

The Activity module provides comprehensive user activity tracking throughout the application. It records actions performed by users with detailed information about what was done, when it occurred, and who initiated the action.

### How to Use

The Activity module is designed to be used across the application to track important user actions. There are two main methods for creating activities:

1. **User Activities**: Record actions initiated by the user themselves

    ```typescript
    this.activityService.createByUser(user, {
        action: ENUM_POLICY_ACTION.UPDATE,
        subject: ENUM_POLICY_SUBJECT.USER,
    });
    ```

2. **Admin Activities**: Record actions performed by admins on user accounts
    ```typescript
    this.activityService.createByAdmin(targetUser, {
        by: adminUserId,
        action: ENUM_POLICY_ACTION.UPDATE,
        subject: ENUM_POLICY_SUBJECT.USER,
    });
    ```
3. **Workspace Activities**: Record actions performed within a specific workspace
    ```typescript
    this.activityService.createByUserWithWorkspace(user, workspace, {
        action: ENUM_POLICY_ACTION.CREATE,
        subject: ENUM_POLICY_SUBJECT.WORKSPACE,
    });
    ```

4. **Reads of personal data**: one `VIEW` row per detail read, keyed by the JWT user id (no user lookup)
    ```typescript
    this.activityService.createView(userId, workspace, ENUM_POLICY_SUBJECT.CUSTOMER, {
        id: customer.id,
    });
    ```

### Request context

Every row carries `ipAddress` and `userAgent`. `ActivityService` fills them
from the current request through `ClsService` (`request.ip`, which honours
`trust proxy`, and the `user-agent` header), so call sites pass nothing. Rows
written outside a request (seeds, workers) leave both `null`.

### Authentication and read actions

| Action | Subject | When | `metadata` |
| --- | --- | --- | --- |
| `login` | `AUTH` | credential, Google or Apple login succeeds | `{ id, name }` (user id, email) |
| `login_failed` | `AUTH` | login rejected for an **existing** user | `{ id, name, reason }` |
| `view` | `CONVERSATION` | `GET /:workspace/conversations/:id` | `{ id }` |
| `view` | `CONVERSATION` | `GET /:workspace/conversations/:id/messages` | `{ id, resource: 'messages' }` |
| `view` | `CUSTOMER` | `GET /:workspace/customers/:id` | `{ id }` |

`reason` is one of `invalid_password`, `locked`, `blocked`, `inactive`,
`role_inactive`, `email_not_verified`, `password_expired`. An unknown email
writes nothing, and the HTTP response is unchanged (a failed audit insert is
logged and swallowed), so the audit log does not leak which accounts exist.
List pages are not logged.

### Immutability

`activities` is append-only (migration `20261008110000_audit_log_append_only`):

- A trigger (`activities_reject_change`) raises on every `UPDATE`, `DELETE`
  and `TRUNCATE`, for every role including the application's. `DROP TABLE`
  (`pnpm db:migrate:fresh`) still works.
- Every FK from `activities` (`user`, `by`, `workspace`, `created_by`,
  `updated_by`, `deleted_by`) is `ON DELETE NO ACTION`: `SET NULL` would be an
  update and `CASCADE` a delete. Users and workspaces are soft-deleted or
  anonymised, never hard-deleted; the workspace soft-delete cascade in
  `WorkspaceOwnerService.delete` deliberately skips `activities`.
- There is no delete method on `ActivityService`. The user seed's `remove`
  refuses to run once audit rows exist; reset a dev database with
  `pnpm db:migrate:fresh`.

### Impersonation activities

`IMPERSONATE_START` / `IMPERSONATE_END` (subject `USER`) bracket an admin
impersonation session. Written via `activityService.createByAdmin(targetUser, adminId, …)`.

| Action | When | `metadata` |
| --- | --- | --- |
| `impersonate_start` | `POST /user/impersonate/:user` succeeds | `{ session, sessionExpiresAt, targetEmail }` |
| `impersonate_end` | `POST /auth/impersonate/end` (Exit or logout) | `{ session, reason: 'manual' }`, or `'expired'` if the session was already past its expiry |
| `impersonate_end` | a renewal refused: session cap reached | `{ session, reason: 'expired' }` |
| `impersonate_end` | a renewal refused: the target or the admin is no longer eligible (blocked, role changed) | `{ session, reason: 'ineligible' }` |
| `impersonate_end` | the session is revoked by another route: the user, an admin, "revoke all", a password change or account deletion | `{ session, reason: 'revoked' }` |
| `impersonate_end` | hourly sweep of a session that was abandoned (tab closed) | `{ session, reason: 'expired_swept' }` |

Every way a session can end writes exactly one `impersonate_end` row: the
revoke and the audit row share a transaction, and the sweep audits only the rows
its own `UPDATE ... RETURNING` changed.

The impersonation session itself is a row in `sessions` with `impersonated_by`
set to the acting admin's id. Its `expired_at` rolls forward with each renewed
access token (`AUTH_JWT_IMPERSONATE_TOKEN_EXPIRED`), so an abandoned session is
swept soon after its last token dies; the absolute cap
(`AUTH_JWT_IMPERSONATE_SESSION_EXPIRED`) is measured from `created_at`.

**Impersonation is read-only.** A token carrying `impersonatedBy` may only use
`GET`/`HEAD`/`OPTIONS`, plus the handlers marked `@AllowImpersonation()`
(`/impersonate/end`, `/impersonate/refresh`). Anything else is refused with
status code `5009`, so "user view mode" cannot delete the account, revoke
sessions or reset API keys in the user's name.

## Password History Module

### Overview

The Password History module tracks user password changes to enforce password policies such as preventing password reuse and monitoring password change frequency. This module is essential for maintaining security standards and compliance requirements.

Key features:

- Records password changes with timestamps
- Stores password hashes for comparison
- Differentiates between different types of password changes (`SIGN_UP`, `FORGOT`, `TEMPORARY`, `CHANGE`)
- Supports querying password history for policy enforcement
- Implements configurable password expiration periods

### How to Use

The Password History module provides two main methods for recording password changes:

1. **User Password History**: Record password changes initiated by the user themselves

    ```typescript
    passwordHistoryService.createByUser(user, {
        type: ENUM_PASSWORD_HISTORY_TYPE.CHANGE,
    });
    ```

2. **Admin Password History**: Record password changes performed by admins
    ```typescript
    passwordHistoryService.createByAdmin(user, {
        by: adminId,
        type: ENUM_PASSWORD_HISTORY_TYPE.TEMPORARY,
    });
    ```
