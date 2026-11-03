import { MessageMediaService } from '@app/modules/conversation/services/message-media.service';
import { RequestTimeout } from '@app/common/request/decorators/request.decorator';
import { Response } from '@app/common/response/decorators/response.decorator';
import { IResponse } from '@app/common/response/interfaces/response.interface';
import { ENUM_TURNSTILE_ACTION } from '@app/common/turnstile/enums/turnstile.action.enum';
import { TurnstileService } from '@app/common/turnstile/services/turnstile.service';
import {
    ENUM_ACCOUNT_STATUS,
    ENUM_ACCOUNT_TYPE,
} from '@app/modules/account/enums/account.enum';
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
    UnprocessableEntityException,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { CHAT_UPLOAD_FILE_MAX_BYTES } from '@app/modules/conversation/constants/message-media.constant';
import { ChatAttachmentResponseDto } from '@app/modules/conversation/dtos/response/chat-attachment.response.dto';
import { WidgetAttachmentRequestDto } from '../dtos/request/widget.attachment.request.dto';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response as ExpressResponse } from 'express';
import {
    WidgetAttachmentDoc,
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
import { widgetWelcomeText } from '../utils/widget-welcome.util';

/** Per-visitor ceiling. Turnstile stops bots at the door; this stops a human farming inference. */
const TURNS_PER_HOUR = 60;
const TURN_WINDOW_SECONDS = 60 * 60;
/** Per-visitor upload ceiling, in the same window. */
const UPLOADS_PER_HOUR = 30;
// A visitor id comes from the browser and resets with it, so uploads are
// also capped per widget: the bucket cannot fill faster than this.
const ACCOUNT_UPLOADS_PER_HOUR = 500;
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
        private readonly rateLimit: ChannelRateLimitService,
        private readonly messageMedia: MessageMediaService
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
            // Same answer as sending a message: the key is right, the owner
            // just has not picked an agent yet (#255).
            throw new UnprocessableEntityException({
                statusCode: ENUM_WIDGET_STATUS_CODE_ERROR.NO_CHATBOT_ATTACHED,
                message: 'widget.error.noChatbotAttached',
            });
        }
        const config = account.config;

        return {
            data: {
                name: chatbot.name,
                avatar: chatbot.avatar,
                welcomeMessage: widgetWelcomeText(chatbot),
                primaryLanguage: chatbot.primaryLanguage,
                theme: config.theme as Record<string, unknown>,
                // Returned so the widget can refuse to render on a page that is
                // not on the list, without a second round trip.
                allowedOrigins: config.allowedOrigins,
                // The business is the controller for its visitors; the
                // widget links this instead of Ecbot's notice when set.
                privacyPolicyUrl: config.privacyPolicyUrl,
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
        const account = await this.admit(key, dto, 'widget', TURNS_PER_HOUR);

        await this.widgetChatService.handleTurn(res, {
            account,
            visitorId: dto.visitorId,
            text: dto.text,
            messageId: dto.messageId,
            attachments: dto.attachments,
        });
    }

    @WidgetAttachmentDoc()
    @Response('widget.attachment')
    @Throttle({ default: { ttl: 60000, limit: 20 } })
    @Post('/:key/attachments')
    @UseInterceptors(
        FileInterceptor('file', {
            storage: multer.memoryStorage(),
            limits: { fileSize: CHAT_UPLOAD_FILE_MAX_BYTES, files: 1 },
        })
    )
    async uploadAttachment(
        @Param('key') key: string,
        @Body() dto: WidgetAttachmentRequestDto,
        @UploadedFile() file?: Express.Multer.File
    ): Promise<IResponse<ChatAttachmentResponseDto>> {
        const account = await this.admit(
            key,
            dto,
            'widget-upload',
            UPLOADS_PER_HOUR
        );
        await this.claimOrRefuse(
            `widget-upload-account:${account.id}`,
            ACCOUNT_UPLOADS_PER_HOUR
        );
        const saved =
            file &&
            (await this.messageMedia.saveUpload(
                this.sessionService.mediaFolder(account.id, dto.visitorId),
                file
            ));
        if (!saved) {
            throw new UnprocessableEntityException({
                statusCode:
                    ENUM_WIDGET_STATUS_CODE_ERROR.ATTACHMENT_NOT_SUPPORTED,
                message: 'widget.error.attachmentNotSupported',
            });
        }
        return {
            data: { type: saved.type, key: saved.key, name: saved.name },
        };
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
            // Staff have taken over, so the widget stops telling the visitor
            // an AI is answering (#257). In `_metadata` so the body stays the
            // message array older widget builds read.
            _metadata: { staffActive: !conversation.botEnabled },
            data: await Promise.all(
                messages.map(async m => ({
                    id: m.id,
                    authorType: m.authorType,
                    text: m.text,
                    attachments: await this.messageMedia.resolve(
                        m.attachments,
                        conversation.id
                    ),
                    dateSent: m.dateSent,
                }))
            ),
        };
    }

    /**
     * The gate every visitor write passes: the widget key, the embedding page
     * on the allowlist, Turnstile once per session, then a per-visitor budget
     * (`bucket` keeps uploads and messages apart).
     */
    private async admit(
        key: string,
        dto: {
            visitorId: string;
            parentOrigin?: string;
            turnstileToken?: string;
        },
        bucket: string,
        perHour: number
    ): Promise<AccountEntity & { config: WebsiteWidgetConfig }> {
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
        await this.claimOrRefuse(`${bucket}:${sessionKey}`, perHour);
        return account;
    }

    private async claimOrRefuse(
        bucket: string,
        perHour: number
    ): Promise<void> {
        const within = await this.rateLimit.claim(
            bucket,
            perHour,
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
