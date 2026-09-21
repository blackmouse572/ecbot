import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FacebookPageResponseDto } from '../dtos/facebook-page.response.dto';
import { FacebookSubscriptionDto } from '../dtos/facebook-subscription.dto';
import { FacebookWebhookInterface } from '../interfaces/facebook-webhook.interface';
import { FacebookBaseService } from './facebook-base.service';

/**
 * Facebook webhook *subscription* management for the account-connect flow:
 * register the app callback and subscribe a page's webhook fields. Inbound
 * webhook *handling* now lives in the unified platform Inbound Inbox (ADR-0007),
 * so the old verify/handle/process methods were removed.
 */
@Injectable()
export class FacebookWebhookService
    extends FacebookBaseService
    implements FacebookWebhookInterface
{
    private readonly loggerService: Logger = new Logger(
        FacebookWebhookService.name
    );

    constructor(
        config: ConfigService,
        private readonly httpService: HttpService
    ) {
        super(config);
    }

    async registerWebhook({
        object,
        fields,
    }: FacebookSubscriptionDto): Promise<boolean> {
        const url = `${this.baseGraphApiUrl}/${this.appId}/subscriptions`;
        const data = {
            object,
            callback_url: this.apiCallbackUrl,
            fields: fields.join(','),
            verify_token: this.webhookSecret,
            access_token: `${this.appId}|${this.appSecret}`,
        };
        try {
            const response = await this.httpService.axiosRef.post(url, data);
            return response?.data?.success ?? false;
        } catch (error) {
            this.loggerService.error(
                'Failed to register webhook:',
                error.response?.data || error.message
            );
            return false;
        }
    }

    async subscribePageWebhook(
        pages: FacebookPageResponseDto[],
        fields: string[]
    ): Promise<boolean> {
        const url = (pageId: string) =>
            `${this.baseGraphApiUrl}/${pageId}/subscribed_apps`;

        for (const { id, access_token } of pages) {
            try {
                const response = await this.httpService.axiosRef.post(
                    url(id),
                    null,
                    {
                        params: {
                            access_token,
                            subscribed_fields: fields.join(','),
                        },
                    }
                );
                const success = response?.data?.success ?? true;
                if (!success) return false;
            } catch (error) {
                this.loggerService.error(
                    `Failed to subscribe to page ${id}:`,
                    error
                );
                return false;
            }
        }

        return true;
    }
}
