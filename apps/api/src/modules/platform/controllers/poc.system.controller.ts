import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { ApiKeySystemProtected } from '@app/modules/api-key/decorators/api-key.decorator';
import {
    Body,
    Controller,
    Logger,
    NotImplementedException,
    Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    IsArray,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
} from 'class-validator';
import { PlatformAdapter } from '../adapters/platform-adapter.base';
import { PLATFORM_SLUG_TO_TYPE } from '../constants/platform-slug.constant';
import { MessageProcessorService } from '../services/message-processor.service';
import { PlatformAdapterRegistry } from '../services/platform-adapter.registry';
import { ReplyGenerationService } from '../services/reply-generation.service';

class PocInboundDto {
    @IsString()
    platform: string;

    @IsString()
    @IsOptional()
    botId?: string;

    @IsString()
    rawBody: string;

    @IsObject()
    headers: Record<string, string>;

    /** Epoch ms stamped by the edge Worker when the webhook arrived there. */
    @IsNumber()
    @IsOptional()
    receivedAt?: number;
}

class PocReplyDto {
    @IsString()
    conversationId: string;

    @IsString()
    senderId: string;

    @IsString()
    customerId: string;

    @IsString()
    contactPointId: string;

    @IsArray()
    @IsString({ each: true })
    texts: string[];

    /** The saved rows of `texts`; an older edge Worker sends none. */
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    messageIds?: string[];
}

/**
 * Generic queue-driven inbound endpoint (POC for the edge Worker path). The
 * edge Worker forwards each queued webhook here instead of the platform
 * calling PlatformWebhookPublicController directly — verification is
 * deferred to this handler (Option B) so a bad signature never reaches
 * MessageProcessorService. Platform-agnostic: Telegram is just one slug.
 */
@ApiTags('modules.system.poc')
@Controller({ version: '1', path: '/poc' })
export class PocSystemController {
    private readonly logger = new Logger(PocSystemController.name);

    constructor(
        private readonly registry: PlatformAdapterRegistry,
        private readonly processor: MessageProcessorService,
        private readonly replyGeneration: ReplyGenerationService
    ) {}

    // Stub adapters (Instagram, TikTok, Shopee) throw 501 here. Answering 5xx
    // would make the edge queue retry the event until Cloudflare gives up, so
    // treat "not built yet" like a bad signature: ack and drop.
    private verify(adapter: PlatformAdapter, dto: PocInboundDto): boolean {
        try {
            return adapter.verifySignature(dto.rawBody, dto.headers);
        } catch (error: unknown) {
            if (!(error instanceof NotImplementedException)) throw error;
            this.logger.warn(
                `poc inbound: ${dto.platform} is not implemented yet, dropping event`
            );
            return false;
        }
    }

    @Post('/inbound')
    @ApiKeySystemProtected()
    async inbound(@Body() dto: PocInboundDto): Promise<{ processed: number }> {
        // Telegram carries botId in the URL; others resolve by slug (same map the public controller uses).
        const type =
            dto.platform === 'telegram'
                ? ENUM_ACCOUNT_TYPE.TELEGRAM_BOT
                : PLATFORM_SLUG_TO_TYPE[dto.platform];
        if (!type || !this.registry.has(type)) return { processed: 0 };

        const adapter = this.registry.get(type);
        // Deferred verification (Option B): the edge forwarded rawBody + headers.
        if (!this.verify(adapter, dto)) return { processed: 0 };

        const events = adapter
            .parse(dto.rawBody)
            .map(e => ({ ...e, accountKey: dto.botId ?? e.accountKey }));

        this.logInboundLag(dto, events);

        for (const event of events) await this.processor.process(event);
        return { processed: events.length };
    }

    @Post('/reply')
    @ApiKeySystemProtected()
    async reply(@Body() dto: PocReplyDto): Promise<{ ok: true }> {
        await this.replyGeneration.run(dto);
        return { ok: true };
    }

    /**
     * Splits the pre-api span into its two legs. Everything from the customer
     * pressing send to this handler used to be one opaque ~7s number, which is
     * where the reply latency actually goes — but "platform was slow" and "the
     * queue was slow" call for opposite fixes, and only the edge knows when it
     * received the webhook. `receivedAt` is its stamp; the event timestamp is
     * the platform's.
     */
    private logInboundLag(
        dto: PocInboundDto,
        events: { timestamp?: Date }[]
    ): void {
        if (!dto.receivedAt) return;
        const arrivedAt = Date.now();
        const platformSentAt = events.find(e => e.timestamp)?.timestamp;
        const platformToEdge = platformSentAt
            ? `${dto.receivedAt - platformSentAt.getTime()}ms`
            : 'n/a';
        this.logger.log(
            `Inbound lag: platform=${dto.platform} events=${events.length} ` +
                `platformToEdge=${platformToEdge} edgeToApi=${arrivedAt - dto.receivedAt}ms`
        );
    }
}
