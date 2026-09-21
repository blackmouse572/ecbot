import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsEnum,
    IsMongoId,
    IsNotEmpty,
    IsOptional,
    IsString,
    ValidateNested,
} from 'class-validator';
import {
    NotificationPriority,
    NotificationType,
} from '../enums/notification.enum';

export class NotificationMetadataDto {
    @ApiProperty({
        required: false,
        description: 'URL for notification action',
        example: '/workspace/123/members',
    })
    @IsOptional()
    @IsString()
    actionUrl?: string;

    @ApiProperty({
        required: false,
        description: 'Text for notification action button',
        example: 'View Details',
    })
    @IsOptional()
    @IsString()
    actionText?: string;

    @ApiProperty({
        required: false,
        description: 'Additional data for the notification',
        example: { inviterId: '123', role: 'member' },
    })
    @IsOptional()
    data?: Record<string, any>;
}

export class NotificationCreateDto {
    @ApiProperty({
        required: true,
        description: 'Notification title',
        example: 'Workspace Invitation',
    })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({
        required: true,
        description: 'Notification message',
        example:
            'You have been invited to join the "Development Team" workspace',
    })
    @IsString()
    @IsNotEmpty()
    message: string;

    @ApiProperty({
        required: true,
        enum: NotificationType,
        description: 'Type of notification',
        example: NotificationType.INVITATION,
    })
    @IsEnum(NotificationType)
    @IsNotEmpty()
    type: NotificationType;

    @ApiProperty({
        required: false,
        enum: NotificationPriority,
        description: 'Priority of notification',
        example: NotificationPriority.MEDIUM,
    })
    @IsEnum(NotificationPriority)
    @IsOptional()
    priority?: NotificationPriority;

    @ApiProperty({
        required: true,
        description: 'Recipient user ID',
        example: '507f1f77bcf86cd799439011',
    })
    @IsMongoId()
    @IsNotEmpty()
    recipient: string;

    @ApiProperty({
        required: false,
        description: 'Workspace this notification belongs to',
    })
    @IsString()
    @IsOptional()
    workspace?: string;

    @ApiProperty({
        required: false,
        description: 'Sender user ID',
        example: '507f1f77bcf86cd799439012',
    })
    @IsOptional()
    sender?: string;

    @ApiProperty({
        required: false,
        description: 'Additional metadata for the notification',
        type: () => NotificationMetadataDto,
    })
    @IsOptional()
    @ValidateNested()
    @Type(() => NotificationMetadataDto)
    metadata?: NotificationMetadataDto;

    @ApiProperty({
        required: false,
        description: 'When to schedule the notification (ISO date)',
        example: '2024-12-31T23:59:59.000Z',
    })
    @IsOptional()
    @IsString()
    scheduledAt?: string;

    @ApiProperty({
        required: false,
        description: 'When the notification expires (ISO date)',
        example: '2025-01-31T23:59:59.000Z',
    })
    @IsOptional()
    @IsString()
    expiresAt?: string;

    @ApiProperty({
        required: false,
        description: 'Tags for categorizing notifications',
        example: ['invitation', 'workspace'],
        type: [String],
    })
    @IsOptional()
    @IsString({ each: true })
    tags?: string[];
}
