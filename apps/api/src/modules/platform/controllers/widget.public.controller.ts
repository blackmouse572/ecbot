import { RequestTimeout } from '@app/common/request/decorators/request.decorator';
import { Response } from '@app/common/response/decorators/response.decorator';
import { IResponse } from '@app/common/response/interfaces/response.interface';
import { ENUM_TURNSTILE_ACTION } from '@app/common/turnstile/enums/turnstile.action.enum';
import { TurnstileService } from '@app/common/turnstile/services/turnstile.service';
import { ENUM_ACCOUNT_STATUS, ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import {
    isWebsiteWidgetAccount,
    WebsiteWidgetConfig,
} from '@app/modules/account/interfaces/account-config.interface';
import { AccountEntity } from '@app/modules/account/repository/entities/account.entity';
import { AccountService } from '@app/modules/account/services/account.service';
import { ConversationRepository } from '@app/modules/conversation/repository/repositories/conversation.repository';
import { MessageRepository } from '@app/modules/conversation/repository/repositories/message.repository';
import {
    Body,
    Controller,
    ForbiddenException,
    Get,
    HttpException,
    HttpStatus,
    NotFoundException,
    Param,
    Post,
    Query,
    Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response as ExpressResponse } from 'express';
import {
    WidgetMessagesDoc,
    WidgetMetaDoc,
    WidgetSendMessageDoc,
} from '../docs/widget.public.doc';
import { WidgetSendMessageRequestDto } from '../dtos/request/widget.send-message.request.dto';
import {
    WidgetMessageResponseDto,
    WidgetMetaResponseDto,
} from '../dtos/response/widget.response.dto';
import { ChannelRateLimitService } from '../services/channel-rate-limit.service';
import { WidgetChatService } from '../services/widget-chat.service';
import { WidgetSessionService } from '../services/widget-session.service';
import { ENUM_WIDGET_STATUS_CODE_ERROR } from '../enums/widget.status-code.enum';

/** Per-visitor ceiling. Turnstile stops bots at the door; this stops a human farming inference. */
const TURNS_PER_HOUR = 60;
const TURN_WINDOW_SECONDS = 60 * 60;
const POLL_PAGE_SIZE = 50;

/**
 * Public surface for the embeddable website widget.
 *
 * Lives on `/public`, not `/client`. ADR-0012 assumed the widget would use a
 * ClientCredential, but that credential is a secret and this code runs in a
 * browser on someone else's website — anyone viewing source would have it. The
 * widget key here is a public identifier instead (like Intercom's app id), and
 * the protections are the ones that survive being public: a `frame-ancestors`
 * CSP on the widget page, Turnstile, and a per-visitor rate limit. See ADR-0014.
 */
@ApiTags('modules.public.widget')
@Controller({ version: '1', path: '/widget' })
export class WidgetPublicController {
    constructor(
        private readonly accountService: AccountService,
        private readonly conversationRepository: ConversationRepository,
        private readonly messageRepository: MessageRepository,
        private readonly sessionService: WidgetSessionService,
        private readonly widgetChatService: WidgetChatService,
        private readonly turnstileService: TurnstileService,
        private readonly rateLimit: ChannelRateLimitService
    ) {}

    @WidgetMetaDoc()
    @Response('widget.meta')
    @Throttle({ default: { ttl: 60000, limit: 60 } })
    @Get('/:key/meta')
    async meta(
        @Param('key') key: string
    ): Promise<IResponse<WidgetMetaResponseDto>> {
        const account = await this.resolveAccount(key);
        const chatbot = account.chatbot;
        if (!chatbot) {
            throw new NotFoundException({
                statusCode: ENUM_WIDGET_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'widget.error.notFound',
            });
        }
        const config = account.config;

        return {
            data: {
                name: chatbot.name,
                avatar: chatbot.avatar,
                welcomeMessage: chatbot.welcomeMessage,
                primaryLanguage: chatbot.primaryLanguage,
                theme: config.theme as Record<string, unknown>,
                // Returned so the widget can refuse to render on a page that is
                // not on the list, without a second round trip.
                allowedOrigins: config.allowedOrigins,
            },
        };
    }

    @WidgetSendMessageDoc()
    @Throttle({ default: { ttl: 60000, limit: 30 } })
    @RequestTimeout('300s')
    @Post('/:key/messages')
    async sendMessage(
        @Param('key') key: string,
        @Res() res: ExpressResponse,
        @Body() dto: WidgetSendMessageRequestDto
    ): Promise<void> {
        const account = await this.resolveAccount(key);

        if (
            !this.sessionService.isOriginAllowed(
                account.config.allowedOrigins,
                dto.parentOrigin
            )
        ) {
            throw new ForbiddenException({
                statusCode: ENUM_WIDGET_STATUS_CODE_ERROR.ORIGIN_NOT_ALLOWED,
                message: 'widget.error.originNotAllowed',
            });
        }

        const sessionKey = this.sessionService.sessionKey(
            account.id,
            dto.visitorId
        );

        // Verified once per session, not per turn: a Turnstile token is
        // single-use and short-lived, so re-challenging would put a widget in
        // front of every message.
        if (!(await this.sessionService.isVerified(sessionKey))) {
            await this.turnstileService.verify(
                dto.turnstileToken,
                ENUM_TURNSTILE_ACTION.WEBSITE_WIDGET
            );
            await this.sessionService.markVerified(sessionKey);
        }

        // Keyed on the visitor, not the IP: behind the load balancer every
        // anonymous visitor shares one address, so IP throttling barely bites.
        const within = await this.rateLimit.claim(
            `widget:${sessionKey}`,
            TURNS_PER_HOUR,
            TURN_WINDOW_SECONDS
        );
        if (!within) {
            throw new HttpException(
                {
                    statusCode: ENUM_WIDGET_STATUS_CODE_ERROR.RATE_LIMITED,
                    message: 'widget.error.rateLimited',
                },
                HttpStatus.TOO_MANY_REQUESTS
            );
        }

        await this.widgetChatService.handleTurn(res, {
            account,
            visitorId: dto.visitorId,
            text: dto.text,
            messageId: dto.messageId,
        });
    }

    @WidgetMessagesDoc()
    @Response('widget.messages')
    @Throttle({ default: { ttl: 60000, limit: 60 } })
    @Get('/:key/messages')
    async messages(
        @Param('key') key: string,
        @Query('visitorId') visitorId: string,
        @Query('after') after?: string
    ): Promise<IResponse<WidgetMessageResponseDto[]>> {
        const account = await this.resolveAccount(key);
        if (!visitorId || !account.chatbot) {
            return { data: [] };
        }

        // Resolving through (chatbot, account, visitorId) is the tenancy check:
        // a cursor from another conversation cannot reach into this one.
        const conversation =
            await this.conversationRepository.findByChatbotAccountSender(
                account.chatbot.id,
                account.id,
                visitorId
            );
        if (!conversation) {
            return { data: [] };
        }

        const messages = await this.messageRepository.findAfter(
            conversation.id,
            after,
            POLL_PAGE_SIZE
        );

        return {
            data: messages.map(m => ({
                id: m.id,
                authorType: m.authorType,
                text: m.text,
                dateSent: m.dateSent,
            })),
        };
    }

    /**
     * Resolve and narrow in one place, so every handler below can read
     * `account.config.allowedOrigins` without a cast. An account whose config
     * never got written is as unusable as a missing one.
     */
    private async resolveAccount(
        key: string
    ): Promise<AccountEntity & { config: WebsiteWidgetConfig }> {
        const account = await this.accountService.findOne(
            {
                externalId: key,
                type: ENUM_ACCOUNT_TYPE.WEBSITE_WIDGET,
                status: ENUM_ACCOUNT_STATUS.ACTIVE,
            },
            { populate: ['chatbot', 'workspace'] } as any
        );
        if (!account || !isWebsiteWidgetAccount(account)) {
            throw new NotFoundException({
                statusCode: ENUM_WIDGET_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'widget.error.notFound',
            });
        }
        return account;
    }
}
