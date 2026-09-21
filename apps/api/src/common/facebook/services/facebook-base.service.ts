import { ENUM_FACEBOOK_MESSAGE_EVENT_TYPE } from '@app/common/enums/facebook.enum';
import { ConfigService } from '@nestjs/config';

export abstract class FacebookBaseService {
    protected readonly appId: string;
    protected readonly appSecret: string;
    protected readonly graphApiVersion: string;
    protected readonly webhookSecret: string;
    protected readonly baseGraphApiUrl: string = 'https://graph.facebook.com';
    protected readonly redirectUri: string;
    protected readonly apiCallbackUrl: string;

    constructor(
        private readonly config: ConfigService,
        path: string = ''
    ) {
        this.appId = config.get<string>('facebook.appId');
        this.appSecret = config.get<string>('facebook.appSecret');
        this.graphApiVersion = config.get<string>('facebook.graphApiVersion');
        this.webhookSecret = config.get<string>('facebook.webhookSecret');
        this.redirectUri = config.get<string>('facebook.redirectUri');
        this.baseGraphApiUrl = `${this.baseGraphApiUrl}/${this.graphApiVersion}${path}`;
        this.apiCallbackUrl = config.get<string>('facebook.apiCallbackUrl');
    }

    getEventType(event: any): ENUM_FACEBOOK_MESSAGE_EVENT_TYPE {
        if (!event) return ENUM_FACEBOOK_MESSAGE_EVENT_TYPE.UNKNOWN;

        if (event.message) {
            if (event.message.is_echo) {
                return ENUM_FACEBOOK_MESSAGE_EVENT_TYPE.ECHO;
            }
            return ENUM_FACEBOOK_MESSAGE_EVENT_TYPE.MESSAGE;
        }

        if (event.postback) {
            return ENUM_FACEBOOK_MESSAGE_EVENT_TYPE.POSTBACK;
        }

        if (event.account_linking) {
            return ENUM_FACEBOOK_MESSAGE_EVENT_TYPE.ACCOUNT_LINKING;
        }

        if (event.delivery) {
            return ENUM_FACEBOOK_MESSAGE_EVENT_TYPE.DELIVERY;
        }

        if (event.read) {
            return ENUM_FACEBOOK_MESSAGE_EVENT_TYPE.READ;
        }

        if (event.referral) {
            return ENUM_FACEBOOK_MESSAGE_EVENT_TYPE.REFERRAL;
        }

        return ENUM_FACEBOOK_MESSAGE_EVENT_TYPE.UNKNOWN;
    }
}
