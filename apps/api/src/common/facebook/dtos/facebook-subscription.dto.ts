import {
    ENUM_FACEBOOK_OBJECT_TO_SUBCRIBE,
    FACEBOOK_SUBSCRIPTION_FIELD,
} from '@app/common/enums/facebook.enum';
import { ApiProperty } from '@nestjs/swagger';
export class FacebookSubscriptionDto {
    @ApiProperty({
        description: 'The object type to subscribe to',
        example: ENUM_FACEBOOK_OBJECT_TO_SUBCRIBE.PAGE,
        enum: ENUM_FACEBOOK_OBJECT_TO_SUBCRIBE,
        type: String,
    })
    object: ENUM_FACEBOOK_OBJECT_TO_SUBCRIBE;

    @ApiProperty({
        description: 'The fields to subscribe to',
        example:
            FACEBOOK_SUBSCRIPTION_FIELD[ENUM_FACEBOOK_OBJECT_TO_SUBCRIBE.PAGE],
        type: [String],
    })
    fields: string[];
}
export class FacebookVerifyWebhookDto {
    @ApiProperty({
        description: 'The mode of the webhook verification',
        example: 'subscribe',
        type: String,
    })
    mode: string;

    @ApiProperty({
        description: 'The verify token for the webhook',
        example: 'your_verify_token',
        type: String,
    })
    verifyToken: string;

    @ApiProperty({
        description: 'The challenge to be returned for verification',
        example: '1234567890',
        type: String,
    })
    challenge: string;
}
