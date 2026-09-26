import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import {
    BadRequestException,
    Controller,
    Get,
    Logger,
    NotFoundException,
    Param,
    Post,
    Req,
    Res,
    type RawBodyRequest,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type {
    Request as ExpressRequest,
    Response as ExpressResponse,
} from 'express';
import { PLATFORM_SLUG_TO_TYPE } from '../constants/platform-slug.constant';
import { PlatformAdapter } from '../adapters/platform-adapter.base';
import { InboundInboxService } from '../services/inbound-inbox.service';
import { PlatformAdapterRegistry } from '../services/platform-adapter.registry';

/**
 * Unified entry point for incoming platform webhooks. Each request is dispatched
 * to the matching PlatformAdapter flat methods:
 *   - GET → adapter.verifyChallenge() (Meta-style hub.challenge handshake)
 *   - POST → verifySignature → parse → durably enqueue each event → 200
 *
 * Receipt-before-ACK (ADR-0007): events are made durable via the Inbound Inbox
 * before the 200, so a crash never drops a message the platform won't retry.
 * Public endpoint. Signature verification is the only auth.
 */
@ApiTags('modules.public.webhooks')
@Controller({ version: '1', path: '/webhooks' })
export class PlatformWebhookPublicController {
    private readonly logger = new Logger(PlatformWebhookPublicController.name);

    constructor(
        private readonly registry: PlatformAdapterRegistry,
        private readonly inbox: InboundInboxService
    ) {}

    @Get(':platform')
    async verify(
        @Param('platform') platformSlug: string,
        @Req() req: ExpressRequest,
        @Res() res: ExpressResponse
    ): Promise<void> {
        this.logger.debug(
            `Webhook received: platform=${platformSlug} ip=${req.ip} path=${req.originalUrl}`
        );

        const adapter = this.resolveAdapter(platformSlug);
        this.logger.debug(
            `Adapter found for platform=${platformSlug} type=${adapter.type}`
        );
        const webRequest = this.toWebRequest(req);
        const challenge = adapter.verifyChallenge(webRequest);
        if (!challenge) {
            this.logger.warn(
                `Webhook challenge rejected for platform=${platformSlug}`
            );
            res.status(404).send('Not Found');
            return;
        }
        // Meta expects the raw hub.challenge back with a text content type —
        // Express's default (application/json for a plain string body) fails
        // the handshake in some clients that sniff the header.
        res.type('text/plain');
        res.status(challenge.status).send(await challenge.text());
    }

    @Post(':platform')
    async receive(
        @Param('platform') platformSlug: string,
        @Req() req: RawBodyRequest<ExpressRequest>,
        @Res() res: ExpressResponse
    ): Promise<void> {
        this.logger.debug(
            `Webhook received: platform=${platformSlug} ip=${req.ip} path=${req.originalUrl}`
        );
        const adapter = this.resolveAdapter(platformSlug);
        this.logger.debug(
            `Adapter found for platform=${platformSlug} type=${adapter.type}`
        );
        const rawBody = req.rawBody?.toString('utf8');
        if (!rawBody) {
            this.logger.error(
                `Webhook rawBody missing for platform=${platformSlug} — check body-parser middleware ordering`
            );
            res.status(500).send('Missing raw body');
            return;
        }

        if (
            !adapter.verifySignature(
                rawBody,
                req.headers as Record<string, string>
            )
        ) {
            this.logger.warn(
                `Webhook signature rejected for platform=${platformSlug}`
            );
            res.status(403).send('Invalid signature');
            return;
        }

        const events = adapter.parse(rawBody);

        // Durably enqueue every event BEFORE acking. If the enqueue fails we
        // return 5xx so the platform retries — the message is never lost.
        try {
            for (const event of events) {
                await this.inbox.accept(adapter.type, event);
            }
        } catch (err) {
            this.logger.error(
                `Inbound enqueue failed: platform=${adapter.type}: ${(err as Error).message}`
            );
            res.status(500).send('Enqueue failed');
            return;
        }

        res.status(200).send('EVENT_RECEIVED');
    }

    /**
     * Telegram-specific route. Telegram does not include the bot's own ID in the
     * webhook payload, so we embed it in the URL path during setWebhook registration.
     * The controller injects it as `accountKey` so downstream lookup hits the right account.
     */
    @Post('telegram/:botId')
    async receiveTelegram(
        @Param('botId') botId: string,
        @Req() req: RawBodyRequest<ExpressRequest>,
        @Res() res: ExpressResponse
    ): Promise<void> {
        const adapter = this.registry.get(ENUM_ACCOUNT_TYPE.TELEGRAM_BOT);
        const rawBody = req.rawBody?.toString('utf8');
        if (!rawBody) {
            this.logger.error(
                'Telegram webhook: rawBody missing — check body-parser middleware ordering'
            );
            res.status(500).send('Missing raw body');
            return;
        }

        if (
            !adapter.verifySignature(
                rawBody,
                req.headers as Record<string, string>
            )
        ) {
            this.logger.warn(
                `Telegram webhook signature rejected for botId=${botId}`
            );
            res.status(403).send('Invalid signature');
            return;
        }

        const events = adapter
            .parse(rawBody)
            .map(event => ({ ...event, accountKey: botId }));

        try {
            for (const event of events) {
                await this.inbox.accept(ENUM_ACCOUNT_TYPE.TELEGRAM_BOT, event);
            }
        } catch (err) {
            this.logger.error(
                `Telegram inbound enqueue failed botId=${botId}: ${(err as Error).message}`
            );
            res.status(500).send('Enqueue failed');
            return;
        }

        res.status(200).send('EVENT_RECEIVED');
    }

    private resolveAdapter(slug: string): PlatformAdapter {
        const type: ENUM_ACCOUNT_TYPE | undefined = PLATFORM_SLUG_TO_TYPE[slug];
        if (!type) {
            throw new NotFoundException({
                message: 'platform.error.unknownSlug',
                statusCode: 404,
                errors: { slug },
            });
        }
        if (!this.registry.has(type)) {
            throw new BadRequestException({
                message: 'platform.error.unsupported',
                statusCode: 400,
                errors: { type },
            });
        }
        return this.registry.get(type);
    }

    private toWebRequest(req: ExpressRequest): Request {
        const protocol = req.protocol ?? 'https';
        const host = req.get('host') ?? 'localhost';
        const url = `${protocol}://${host}${req.originalUrl}`;
        const headers = new Headers();
        for (const [key, value] of Object.entries(req.headers)) {
            if (Array.isArray(value)) {
                headers.set(key, value.join(', '));
            } else if (value !== undefined) {
                headers.set(key, value);
            }
        }
        return new Request(url, { method: req.method, headers });
    }
}
