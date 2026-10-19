import { ApiProperty } from '@nestjs/swagger';
import { NOTIFICATION_PUSH_SERVICE_HOSTS } from '../../constants/notification.push.constant';
import { Type } from 'class-transformer';
import {
    IsNotEmpty,
    IsString,
    IsUrl,
    MaxLength,
    ValidateNested,
} from 'class-validator';

export class NotificationPushSubscribeKeysRequestDto {
    @ApiProperty({
        required: true,
        example:
            'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM',
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    p256dh: string;

    @ApiProperty({ required: true, example: 'tBHItJI5svbpez7KI4CCXg' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    auth: string;
}

/** The browser's PushSubscription, as `subscription.toJSON()` returns it. */
export class NotificationPushSubscribeRequestDto {
    @ApiProperty({
        required: true,
        example: 'https://fcm.googleapis.com/fcm/send/abc123',
    })
    @IsUrl({
        protocols: ['https'],
        require_protocol: true,
        host_whitelist: NOTIFICATION_PUSH_SERVICE_HOSTS,
    })
    @MaxLength(2000)
    endpoint: string;

    @ApiProperty({
        required: true,
        type: NotificationPushSubscribeKeysRequestDto,
    })
    @ValidateNested()
    @Type(() => NotificationPushSubscribeKeysRequestDto)
    keys: NotificationPushSubscribeKeysRequestDto;
}
