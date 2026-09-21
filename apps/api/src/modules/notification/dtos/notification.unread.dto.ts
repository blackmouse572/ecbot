import { ApiProperty } from '@nestjs/swagger';

export class NotificationUnreadDto {
    @ApiProperty({
        description: 'The number of unread notifications',
        example: 5,
        type: Number,
    })
    count: number;
}
