import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class NotificationPushUnsubscribeRequestDto {
    @ApiProperty({
        required: true,
        example: 'https://fcm.googleapis.com/fcm/send/abc123',
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(2000)
    endpoint: string;
}
