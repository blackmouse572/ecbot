export enum NotificationType {
    INFO = 'info',
    SUCCESS = 'success',
    WARNING = 'warning',
    ERROR = 'error',
    REMINDER = 'reminder',
    INVITATION = 'invitation',
    ACTIVITY = 'activity',
    SYSTEM = 'system',
    REQUEST = 'request',
}

export enum NotificationPriority {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    URGENT = 'urgent',
}

export enum NotificationStatus {
    READ = 'read',
    ARCHIVED = 'archived',
    UNREAD = 'unread',
    DISMISSED = 'dismissed',
}
