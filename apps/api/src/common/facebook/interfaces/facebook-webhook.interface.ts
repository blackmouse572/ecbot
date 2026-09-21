import { FacebookSubscriptionDto } from '../dtos/facebook-subscription.dto';

export interface FacebookWebhookInterface {
    registerWebhook(payload: FacebookSubscriptionDto): Promise<boolean>;
}
