import { ApiProperty } from '@nestjs/swagger';

export class NotificationPushPublicKeyResponseDto {
    @ApiProperty({
        description:
            'VAPID public key for PushManager.subscribe; null when push is off',
        example:
            'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U',
        type: String,
        nullable: true,
    })
    publicKey: string | null;
}
