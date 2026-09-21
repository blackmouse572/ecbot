import { AccountRepositoryModule } from '@app/modules/account/repository/account.repository.module';
import { ChatbotModule } from '@app/modules/chatbot/chatbot.module';
import { HttpModule } from '@nestjs/axios';
import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AxiosRetryModule } from 'nestjs-axios-retry';
import { FacebookActivityModule } from '../facebook-activity/facebook-activity.module';
import { FacebookAuthService } from './services/facebook-auth.service';
import { FacebookPageService } from './services/facebook-page.service';
import { FacebookWebhookService } from './services/facebook-webhook.service';

// Graph API calls should fail fast rather than hang a request thread.
const FACEBOOK_HTTP_CLIENT_OPTIONS = {
    timeout: 5 * 1000,
    headers: {
        Connection: 'close',
    },
};

/**
 * Facebook account-connect + page-management infrastructure. Inbound webhook
 * handling moved to the unified platform Inbound Inbox (ADR-0007); the old
 * controller, handlers, event processor, dedupe and FACEBOOK_WEBHOOK_QUEUE
 * were removed.
 */
@Global()
@Module({})
export class FacebookModule {
    static forRoot(): DynamicModule {
        return {
            module: FacebookModule,
            providers: [
                FacebookAuthService,
                FacebookPageService,
                FacebookWebhookService,
            ],
            exports: [
                FacebookAuthService,
                FacebookPageService,
                FacebookWebhookService,
            ],
            imports: [
                HttpModule.register(FACEBOOK_HTTP_CLIENT_OPTIONS),

                ConfigModule,
                AxiosRetryModule.forRoot({
                    axiosRetryConfig: {
                        retries: 3,
                        retryDelay: retryCount => {
                            return retryCount * 2000; // time interval between retries
                        },
                        retryCondition: error => {
                            // retry on network errors or 5xx status codes
                            return (
                                error.code === 'ECONNABORTED' ||
                                error.code === 'ENOTFOUND' ||
                                (error.response && error.response.status >= 500)
                            );
                        },
                    },
                }),
                ChatbotModule,
                AccountRepositoryModule,
                FacebookActivityModule,
            ],
        };
    }
}
