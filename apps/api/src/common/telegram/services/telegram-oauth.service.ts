import {
    IOAuthPlatformService,
    IOAuthTokenResult,
} from '@app/common/oauth/interfaces/oauth-platform.interface';
import { HttpService } from '@nestjs/axios';
import {
    HttpException,
    Injectable,
    Logger,
    ServiceUnavailableException,
    UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface TelegramBot {
    id: number;
    is_bot: boolean;
    first_name: string;
    username: string;
}

interface TelegramResponse<T> {
    ok: boolean;
    result?: T;
    description?: string;
}

@Injectable()
export class TelegramOAuthService implements IOAuthPlatformService {
    private readonly logger = new Logger(TelegramOAuthService.name);
    private readonly apiUrl: string;
    private readonly webhookBaseUrl: string;
    private readonly webhookSecretToken: string;

    constructor(
        private readonly config: ConfigService,
        private readonly http: HttpService
    ) {
        this.apiUrl =
            config.get<string>('telegram.apiUrl') ?? 'https://api.telegram.org';
        // TELEGRAM_WEBHOOK_URL sends updates through the edge Worker. Without
        // it, bots post to this API's own public webhook route.
        this.webhookBaseUrl =
            config.get<string>('telegram.webhookUrl') ??
            this.apiWebhookBaseUrl(config);
        this.webhookSecretToken =
            config.get<string>('telegram.webhookSecretToken') ?? '';
    }

    private apiWebhookBaseUrl(config: ConfigService): string {
        // Backend origin reachable from the public internet (API_BACKEND_URL),
        // NOT home.url — that points at the frontend and is only for email links.
        const backendUrl = config.get<string>('app.backendUrl');
        if (!backendUrl) return '';
        // Compose the route prefix from the same config the app boots with:
        // globalPrefix (/api) + URI version (v1) → /api/v1
        const globalPrefix = config.get<string>('app.globalPrefix') ?? '';
        const versionPrefix = config.get<string>('app.urlVersion.prefix') ?? '';
        const version = config.get<string>('app.urlVersion.version') ?? '';
        return `${backendUrl}${globalPrefix}/${versionPrefix}${version}/public/webhooks/telegram`;
    }

    async getTokenAndProfile(botToken: string): Promise<IOAuthTokenResult> {
        const bot = await this.getMe(botToken);

        await this.registerWebhook(botToken, bot.id);

        return {
            accessToken: botToken,
            externalId: bot.id.toString(),
            name: bot.first_name,
            link: `https://t.me/${bot.username}`,
        };
    }

    async refreshCredentials(accessToken: string): Promise<IOAuthTokenResult> {
        // Telegram bot tokens never expire — just re-validate without re-registering the webhook
        const bot = await this.getMe(accessToken);
        return {
            accessToken,
            externalId: bot.id.toString(),
            name: bot.first_name,
            link: `https://t.me/${bot.username}`,
        };
    }

    private async getMe(botToken: string): Promise<TelegramBot> {
        if (!/^\d+:[A-Za-z0-9_-]{35,}$/.test(botToken)) {
            throw new UnprocessableEntityException({
                message: 'telegram.error.invalidToken',
            });
        }
        const url = `${this.apiUrl}/bot${botToken}/getMe`;
        try {
            const res =
                await this.http.axiosRef.get<TelegramResponse<TelegramBot>>(
                    url
                );
            if (!res.data.ok || !res.data.result) {
                throw new UnprocessableEntityException({
                    message: 'telegram.error.invalidToken',
                    description: res.data.description,
                });
            }
            return res.data.result;
        } catch (err) {
            if (err?.response?.status === 401) {
                throw new UnprocessableEntityException({
                    message: 'telegram.error.invalidToken',
                });
            }
            // Preserve any HttpException we deliberately threw above (e.g. the
            // invalid-token 422 from a non-ok response body).
            if (err instanceof HttpException) {
                throw err;
            }
            // Transient network failure reaching api.telegram.org or an upstream
            // 5xx. Surface a retryable 503 instead of an opaque 500 raw error.
            throw new ServiceUnavailableException({
                message: 'telegram.error.unreachable',
            });
        }
    }

    async onUnlink(botToken: string): Promise<void> {
        await this.deleteWebhook(botToken);
    }

    async deleteWebhook(botToken: string): Promise<void> {
        // Best-effort: unregistering the webhook must never abort the unlink —
        // swallow the failure and warn, exactly like registerWebhook.
        try {
            const res = await this.http.axiosRef.post<
                TelegramResponse<boolean>
            >(`${this.apiUrl}/bot${botToken}/deleteWebhook`);

            if (!res.data.ok) {
                this.logger.warn(
                    `TELEGRAM: deleteWebhook failed: ${res.data.description}`
                );
            } else {
                this.logger.log('TELEGRAM: webhook deleted');
            }
        } catch (err) {
            const description =
                err?.response?.data?.description ?? err?.message ?? err;
            this.logger.warn(`TELEGRAM: deleteWebhook error: ${description}`);
        }
    }

    private async registerWebhook(
        botToken: string,
        botId: number
    ): Promise<void> {
        if (!this.webhookBaseUrl) {
            this.logger.warn(
                `TELEGRAM: neither TELEGRAM_WEBHOOK_URL nor API_BACKEND_URL is set, skipping setWebhook for bot ${botId}`
            );
            return;
        }

        // Include botId in path so the controller can inject it as accountKey,
        // since Telegram webhook payloads do not contain the bot's own ID.
        const webhookUrl = `${this.webhookBaseUrl}/${botId}`;
        // Setting allowed_updates overrides Telegram's defaults, so every
        // update type the adapter's parse() relies on must be listed
        // explicitly — including message_reaction, which is NOT delivered
        // by default even when allowed_updates is omitted entirely.
        const body: Record<string, unknown> = {
            url: webhookUrl,
            allowed_updates: [
                'message',
                'edited_message',
                'callback_query',
                'message_reaction',
            ],
        };
        if (this.webhookSecretToken) {
            if (!/^[A-Za-z0-9_-]{1,256}$/.test(this.webhookSecretToken)) {
                this.logger.warn(
                    'TELEGRAM: TELEGRAM_WEBHOOK_SECRET_TOKEN is invalid (1-256 chars, A-Za-z0-9_- only) — skipping secret_token'
                );
            } else {
                body.secret_token = this.webhookSecretToken;
            }
        }

        // Best-effort: a non-public / non-HTTPS backendUrl (e.g. local dev) makes
        // Telegram reject setWebhook with 400. Registering the webhook must not
        // abort account linking — swallow the failure and warn.
        try {
            const res = await this.http.axiosRef.post<
                TelegramResponse<boolean>
            >(`${this.apiUrl}/bot${botToken}/setWebhook`, body);

            if (!res.data.ok) {
                this.logger.warn(
                    `TELEGRAM: setWebhook failed for bot ${botId}: ${res.data.description}`
                );
            } else {
                this.logger.log(
                    `TELEGRAM: webhook registered for bot ${botId} → ${webhookUrl}`
                );
            }
        } catch (err) {
            const description =
                err?.response?.data?.description ?? err?.message ?? err;
            this.logger.warn(
                `TELEGRAM: setWebhook error for bot ${botId}: ${description}`
            );
        }
    }
}
