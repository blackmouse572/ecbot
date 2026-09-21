import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { NotificationStatus } from '../enums/notification.enum';

export class NotificationUpdateDto {
    @ApiProperty({
        required: false,
        enum: NotificationStatus,
        enumName: 'NotificationStatus',
        example: NotificationStatus.READ,
    })
    @IsEnum(NotificationStatus)
    @IsOptional()
    status?: NotificationStatus;
}

export class NotificationMarkAsReadDto {
    @ApiProperty({
        required: false,
        type: [String],
        example: ['notificationId1', 'notificationId2'],
    })
    @IsOptional()
    ids?: string[];
}
