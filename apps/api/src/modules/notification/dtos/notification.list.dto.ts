import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationListDto } from '../../../common/pagination/dtos/pagination.list.dto';
import {
    NotificationPriority,
    NotificationStatus,
    NotificationType,
} from '../enums/notification.enum';

export class NotificationListDto extends PaginationListDto {
    @ApiProperty({
        required: false,
        enum: NotificationType,
        description: 'Filter by notification type',
        example: NotificationType.INVITATION,
    })
    @IsEnum(NotificationType)
    @IsOptional()
    @Type(() => String)
    type?: NotificationType;

    @ApiProperty({
        required: false,
        enum: NotificationStatus,
        enumName: 'NotificationStatus',
        description: 'Filter by notification status',
    })
    @IsEnum(NotificationStatus)
    @IsOptional()
    @Type(() => String)
    status?: NotificationStatus;

    @ApiProperty({
        required: false,
        enum: NotificationPriority,
        description: 'Filter by notification priority',
        example: NotificationPriority.HIGH,
    })
    @IsEnum(NotificationPriority)
    @IsOptional()
    @Type(() => String)
    priority?: NotificationPriority;

    @ApiProperty({
        required: false,
        description: 'Filter by workspace ID',
        example: '507f1f77bcf86cd799439013',
    })
    @IsString()
    @IsOptional()
    @Type(() => String)
    workspace?: string;

    @ApiProperty({
        required: false,
        description: 'Filter by recipient ID',
        example: '507f1f77bcf86cd799439011',
    })
    @IsString()
    @IsOptional()
    @Type(() => String)
    recipient?: string;

    @ApiProperty({
        required: false,
        description: 'Filter by sender ID',
        example: '507f1f77bcf86cd799439012',
    })
    @IsString()
    @IsOptional()
    @Type(() => String)
    sender?: string;
}
