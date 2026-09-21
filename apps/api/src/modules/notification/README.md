# Notification Module

The Notification Module provides a comprehensive notification system for user communications within the application. It's built following the same patterns as the email module and integrates seamlessly with the workspace entity.

## Features

- **Multi-type Notifications**: Support for various notification types (INFO, SUCCESS, WARNING, ERROR, REMINDER, INVITATION, ACTIVITY, SYSTEM)
- **Priority System**: Four priority levels (LOW, MEDIUM, HIGH, URGENT)
- **Status Management**: Track notification states (UNREAD, READ, ARCHIVED, DISMISSED)
- **Workspace Integration**: Link notifications to specific workspaces
- **User Relations**: Track senders and recipients
- **Metadata Support**: Flexible metadata storage for custom data
- **Scheduling**: Support for scheduled and expiring notifications
- **Batch Operations**: Mark multiple notifications as read/archived
- **Tagging System**: Categorize notifications with tags

## Architecture

### Directory Structure

```
src/modules/notification/
├── controllers/
│   └── notification.controller.ts
├── dtos/
│   ├── notification.create.dto.ts
│   ├── notification.list.dto.ts
│   └── notification.update.dto.ts
├── enums/
│   └── notification.enum.ts
├── interfaces/
│   └── notification.service.interface.ts
├── repository/
│   ├── entities/
│   │   └── notification.entity.ts
│   ├── repositories/
│   │   └── notification.repository.ts
│   └── notification.repository.module.ts
├── services/
│   └── notification.service.ts
└── notification.module.ts
```

### Entity Schema

The `NotificationEntity` includes:

- **Core Fields**: title, message, type, priority, status
- **User Relations**: recipient, sender (MongoDB ObjectId references)
- **Workspace Integration**: workspace (links to WorkspaceEntity)
- **Metadata**: Flexible JSON object for custom data
- **Scheduling**: scheduledAt, expiresAt timestamps
- **Tracking**: readAt, archivedAt timestamps
- **Categorization**: tags array
- **Audit Trail**: Standard created/updated/deleted fields

### Enums

- **NotificationType**: INFO, SUCCESS, WARNING, ERROR, REMINDER, INVITATION, ACTIVITY, SYSTEM
- **NotificationPriority**: LOW, MEDIUM, HIGH, URGENT
- **NotificationStatus**: UNREAD, READ, ARCHIVED, DISMISSED

## API Endpoints

### Core CRUD Operations

- `GET /notification/list` - List notifications with pagination and filtering
- `GET /notification/:id` - Get notification by ID
- `POST /notification` - Create new notification
- `PUT /notification/:id` - Update notification
- `DELETE /notification/:id` - Soft delete notification

### Status Management

- `PUT /notification/:id/read` - Mark notification as read
- `PUT /notification/:id/archive` - Mark notification as archived
- `PUT /notification/read-all/:recipientId` - Mark all notifications as read for user

### Query Operations

- `GET /notification/unread/count/:recipientId` - Get unread count for user
- `GET /notification/unread/count/workspace/:workspaceId` - Get unread count for workspace
- `GET /notification/workspace/:workspaceId` - Get notifications by workspace
- `GET /notification/recipient/:recipientId` - Get notifications by recipient

### Specialized Notifications

- `POST /notification/workspace/invitation` - Create workspace invitation notification
- `POST /notification/workspace/activity` - Create workspace activity notifications

## Usage Examples

### Creating a Basic Notification

```typescript
const notification = await notificationService.create({
    title: 'Welcome!',
    message: 'Welcome to our platform',
    type: NotificationType.INFO,
    priority: NotificationPriority.MEDIUM,
    recipient: 'userId123',
    workspace: 'workspaceId456',
});
```

### Creating a Workspace Invitation

```typescript
const invitation = await notificationService.createWorkspaceInvitation(
    'workspaceId',
    'recipientId',
    'senderId',
    'My Workspace'
);
```

### Filtering Notifications

```typescript
// Get high priority unread notifications for a user
const notifications = await notificationService.findAll({
    recipient: 'userId123',
    status: NotificationStatus.UNREAD,
    priority: NotificationPriority.HIGH,
});
```

### Bulk Operations

```typescript
// Mark all notifications as read for a user
await notificationService.markAllAsReadByRecipient('userId123');

// Clean up expired notifications
await notificationService.deleteExpiredNotifications();
```

## Repository Methods

The notification repository extends `DatabaseRepositoryBase` and includes custom methods:

- `findByWorkspace(workspaceId)` - Find notifications by workspace
- `findByRecipient(recipientId)` - Find notifications by recipient
- `markAsRead(id)` - Mark single notification as read
- `markAsArchived(id)` - Mark single notification as archived
- `countUnreadByRecipient(recipientId)` - Count unread notifications for user
- `countUnreadByWorkspace(workspaceId)` - Count unread notifications for workspace

## Service Interface

The service implements `INotificationService` which defines:

### Core CRUD

- `findAll()`, `findOneById()`, `create()`, `update()`, `delete()`
- `getTotal()` - Get total count with filters

### Specialized Queries

- `findAllByWorkspace()`, `findAllByRecipient()`
- `findAllWithPagination()` - Paginated results

### Status Management

- `markAsRead()`, `markAsArchived()`
- `getUnreadCount()`, `getUnreadCountByWorkspace()`
- `markAllAsReadByRecipient()`

### Utility Methods

- `deleteExpiredNotifications()` - Cleanup expired notifications
- `createWorkspaceInvitation()` - Create invitation notifications
- `createWorkspaceActivity()` - Create activity notifications

## Data Transfer Objects

### NotificationCreateDto

Required fields for creating notifications with validation:

- `title` (required, string, 1-200 chars)
- `message` (required, string, 1-1000 chars)
- `type` (required, enum)
- `recipient` (required, MongoDB ObjectId)
- `workspace` (required, MongoDB ObjectId)

Optional fields:

- `priority`, `sender`, `metadata`, `scheduledAt`, `expiresAt`, `tags`

### NotificationUpdateDto

Partial version of create DTO for updates.

### NotificationListDto

Query parameters for listing notifications:

- Filters: `type`, `status`, `priority`, `workspace`, `recipient`, `sender`
- Pagination: inherited from `PaginationListDto`

## Integration with Workspace

The notification module is tightly integrated with the workspace system:

1. **Foreign Key Relationship**: `workspace` field references `WorkspaceEntity._id`
2. **Workspace-scoped Queries**: Filter notifications by workspace
3. **Workspace Events**: Automatic notifications for workspace activities
4. **Invitation System**: Built-in workspace invitation notifications

## Error Handling

The module follows standard API error patterns:

- 400 Bad Request for validation errors
- 404 Not Found for missing notifications
- 500 Internal Server Error for system issues

## Performance Considerations

- **Indexes**: MongoDB indexes on recipient, workspace, status, and createdAt
- **Pagination**: All list endpoints support pagination
- **Soft Deletes**: Uses soft delete pattern for data retention
- **Batch Operations**: Efficient bulk updates for read/archive operations

## Testing

The module can be tested by:

1. Creating sample notifications
2. Testing CRUD operations
3. Verifying workspace integration
4. Testing pagination and filtering
5. Validating bulk operations

## Dependencies

- `@nestjs/common` - Core NestJS functionality
- `@nestjs/swagger` - API documentation
- `class-validator` - DTO validation
- `class-transformer` - Data transformation
- Custom common modules:
    - Database module for repository base
    - Pagination module for list operations
    - Response module for API responses

## Future Enhancements

Potential future features:

- Real-time notifications via WebSocket
- Email/SMS delivery integration
- Notification templates
- User notification preferences
- Push notification support
- Notification analytics
- Advanced scheduling (recurring notifications)
