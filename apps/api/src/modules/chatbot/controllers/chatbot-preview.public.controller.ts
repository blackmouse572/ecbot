import {
    Body,
    Controller,
    Get,
    HttpException,
    HttpStatus,
    NotFoundException,
    Param,
    Post,
    Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response as ExpressResponse } from 'express';
import { RequestTimeout } from 'src/common/request/decorators/request.decorator';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import {
    ChatbotPreviewMetaDoc,
    ChatbotPreviewStreamDoc,
} from '../docs/chatbot.doc';
import { ChatbotPreviewStreamRequestDto } from '../dtos/request/chatbot.preview-stream.request.dto';
import { ChatbotPreviewMetaResponseDto } from '../dtos/response/chatbot.preview-meta.response.dto';
import { ENUM_CHATBOT_STATUS } from '../enums/chatbot.enum';
import { ENUM_CHATBOT_STATUS_CODE_ERROR } from '../enums/chatbot.status-code.enum';
import { ChatbotEntity } from '../repository/entities/chatbot.entity';
import { ChatbotPreviewService } from '../services/chatbot-preview.service';
import { ChatbotPreviewSessionService } from '../services/chatbot-preview-session.service';
import { ChatbotShareTokenService } from '../services/chatbot-share-token.service';
import { ChatbotService } from '../services/chatbot.service';
import { ENUM_TURNSTILE_ACTION } from 'src/common/turnstile/enums/turnstile.action.enum';
import { TurnstileService } from 'src/common/turnstile/services/turnstile.service';

/**
 * Anonymous chatbot preview behind a signed share link (issue #80).
 *
 * Lives on `/public` rather than `/client`: ADR-0012 reserves `/client` for
 * callers that authenticate with a workspace-owned ClientCredential and derive
 * their workspace from it. A share link has neither — the workspace comes from
 * the signed token. The website widget turned out to belong on `/public` too,
 * for a different reason: it runs in a browser and cannot hold a secret
 * (ADR-0014). The API channel is the caller ADR-0012 actually described.
 */
@ApiTags('modules.public.chatbot')
@Controller('/chatbots/preview')
export class ChatbotPreviewPublicController {
    constructor(
        private readonly chatbotService: ChatbotService,
        private readonly shareTokenService: ChatbotShareTokenService,
        private readonly previewService: ChatbotPreviewService,
        private readonly previewSessionService: ChatbotPreviewSessionService,
        private readonly turnstileService: TurnstileService
    ) {}

    @ChatbotPreviewMetaDoc()
    @Response('chatbot.preview')
    @Throttle({ default: { ttl: 60000, limit: 30 } })
    @Get('/:token')
    async meta(
        @Param('token') token: string
    ): Promise<IResponse<ChatbotPreviewMetaResponseDto>> {
        const { chatbot, expiresAt } = await this.resolve(token);

        return {
            data: {
                name: chatbot.name,
                avatar: chatbot.avatar,
                welcomeMessage: chatbot.welcomeMessage,
                primaryLanguage: chatbot.primaryLanguage,
                expiresAt,
            },
        };
    }

    @Throttle({ default: { ttl: 60000, limit: 20 } })
    @ChatbotPreviewStreamDoc()
    @RequestTimeout('300s')
    @Post('/stream')
    async stream(
        @Res() res: ExpressResponse,
        @Body() dto: ChatbotPreviewStreamRequestDto
    ): Promise<void> {
        const { chatbot, jti } = await this.resolve(dto.token);

        const sessionKey = this.previewSessionService.publicKey({
            token: dto.token,
            sessionId: dto.chat_session_id ?? chatbot.id,
        });

        // Turnstile gates entry to the session, before any budget is spent —
        // otherwise a bot burns a session's quota with tokens it never solved.
        // Verified once per session, not per turn: a Turnstile token is
        // single-use and short-lived, so re-challenging would put a widget in
        // front of every message.
        if (!(await this.previewSessionService.isVerified(sessionKey))) {
            await this.turnstileService.verify(
                dto.turnstileToken,
                // Scoped so a token solved on the login form cannot open a
                // preview session.
                ENUM_TURNSTILE_ACTION.CHATBOT_PREVIEW
            );
            await this.previewSessionService.markVerified(sessionKey);
        }

        // Turnstile stops bots at the door; the budget is what stops a real
        // person from farming free inference. IP throttling barely bites here:
        // behind the load balancer every anonymous visitor shares one address.
        const withinTokenBudget =
            await this.previewSessionService.claimTokenTurn(jti);
        const withinSessionBudget =
            await this.previewSessionService.claimTurn(sessionKey);
        if (!withinTokenBudget || !withinSessionBudget) {
            throw new HttpException(
                {
                    statusCode:
                        ENUM_CHATBOT_STATUS_CODE_ERROR.PREVIEW_SESSION_LIMIT,
                    message: 'chatbot.error.previewSessionLimit',
                },
                HttpStatus.TOO_MANY_REQUESTS
            );
        }

        await this.previewService.streamTo(res, {
            chatbot,
            sessionKey,
            message: dto.message,
            // No user behind a share link; the id is only echoed to apps/ai.
            userId: `share:${jti}`,
            chatSessionId: dto.chat_session_id,
        });
    }

    private async resolve(
        token: string
    ): Promise<{ chatbot: ChatbotEntity; jti: string; expiresAt: Date }> {
        const payload = this.shareTokenService.verify(token);

        // Scope the lookup to the token's workspace even though the token
        // names the chatbot — a tampered id must not reach another tenant.
        const chatbot = await this.chatbotService.findOne({
            id: payload.chatbotId,
            workspace: payload.workspaceId,
            deletedAt: null,
        });

        // Operators may preview an inactive bot from inside the workspace;
        // a public link may not.
        if (!chatbot || chatbot.status !== ENUM_CHATBOT_STATUS.ACTIVE) {
            throw new NotFoundException({
                statusCode:
                    ENUM_CHATBOT_STATUS_CODE_ERROR.PREVIEW_NOT_AVAILABLE,
                message: 'chatbot.error.previewNotAvailable',
            });
        }

        // `exp` is seconds since the epoch, per the JWT spec.
        return {
            chatbot,
            jti: payload.jti,
            expiresAt: new Date(payload.exp * 1000),
        };
    }
}
