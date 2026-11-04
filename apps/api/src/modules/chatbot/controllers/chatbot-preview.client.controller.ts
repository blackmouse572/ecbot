import { ENUM_APP_STATUS_CODE_ERROR } from '@app/app/enums/app.status-code.enum';
import { RequestTimeout } from '@app/common/request/decorators/request.decorator';
import { Response } from '@app/common/response/decorators/response.decorator';
import { IResponse } from '@app/common/response/interfaces/response.interface';
import {
    ClientCredentialPayload,
    ClientCredentialProtected,
} from '@app/modules/client-credential/decorators/client-credential.decorator';
import { ClientCredentialEntity } from '@app/modules/client-credential/repository/entities/client-credential.entity';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '@app/modules/policy/enums/policy.enum';
import { WorkspacePayload } from '@app/modules/workspace/decorators/workspace.decorator';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import { ChannelRateLimitService } from '@app/modules/platform/services/channel-rate-limit.service';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    NotFoundException,
    Param,
    Post,
    Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { randomBytes } from 'crypto';
import type { Response as ExpressResponse } from 'express';
import {
    CHATBOT_CLIENT_PREVIEW_RATE_LIMIT,
    CHATBOT_CLIENT_PREVIEW_RATE_WINDOW_SECONDS,
} from '../constants/chatbot-preview.constant';
import { ENUM_CHATBOT_STATUS_CODE_ERROR } from '../enums/chatbot.status-code.enum';
import { ChatbotClientPreviewDoc } from '../docs/chatbot.client.doc';
import { ChatbotClientPreviewRequestDto } from '../dtos/request/chatbot.client-preview.request.dto';
import { ChatbotClientPreviewResponseDto } from '../dtos/response/chatbot.client-preview.response.dto';
import { ChatbotPreviewService } from '../services/chatbot-preview.service';
import { ChatbotPreviewSessionService } from '../services/chatbot-preview-session.service';
import { ChatbotService } from '../services/chatbot.service';

// The app's preview chat on the /client surface (ADR-0012), for the Ecbot MCP
// Server's test_chatbot tool. The same turn as POST /chatbots/:id/stream, with
// the reply returned as one JSON body. Nothing reaches the inbox.
@ApiTags('modules.client.chatbot')
@Controller('/chatbots')
export class ChatbotPreviewClientController {
    constructor(
        private readonly chatbotService: ChatbotService,
        private readonly previewService: ChatbotPreviewService,
        private readonly previewSessionService: ChatbotPreviewSessionService,
        private readonly rateLimit: ChannelRateLimitService
    ) {}

    @ChatbotClientPreviewDoc()
    @Response('chatbot.previewReply')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.CHATBOT,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @RequestTimeout('300s')
    @Post('/:id/preview')
    async preview(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @ClientCredentialPayload() credential: ClientCredentialEntity,
        @Param('id') id: string,
        @Body() dto: ChatbotClientPreviewRequestDto,
        @Res({ passthrough: true }) res: ExpressResponse
    ): Promise<IResponse<ChatbotClientPreviewResponseDto>> {
        // A script holding the key could otherwise run turns, and the bot's
        // own Tools, as fast as apps/ai answers.
        const within = await this.rateLimit.claim(
            `chatbot-preview:${credential.id}`,
            CHATBOT_CLIENT_PREVIEW_RATE_LIMIT,
            CHATBOT_CLIENT_PREVIEW_RATE_WINDOW_SECONDS
        );
        if (!within) {
            throw new HttpException(
                {
                    statusCode:
                        ENUM_CHATBOT_STATUS_CODE_ERROR.PREVIEW_RATE_LIMITED,
                    message: 'chatbot.error.previewRateLimited',
                },
                HttpStatus.TOO_MANY_REQUESTS
            );
        }

        const chatbot = await this.chatbotService.findOne({
            id,
            workspace: workspace.id,
            deletedAt: null,
        });
        if (!chatbot) {
            throw new NotFoundException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'chatbot.error.notFound',
            });
        }

        // A caller that times out or disconnects stops apps/ai generating
        // (and billing) for nobody, as the app's SSE preview does.
        const caller = new AbortController();
        res.on('close', () => {
            if (!res.writableFinished) caller.abort();
        });

        const sessionId =
            dto.sessionId ?? randomBytes(12).toString('base64url');
        // Operators preview inactive bots on purpose, as in the app.
        const answer = await this.previewService.reply({
            chatbot,
            // Keyed to the credential, not its creator, so two keys of the
            // same member never share a transcript.
            sessionKey: this.previewSessionService.workspaceKey({
                workspaceId: workspace.id,
                chatbotId: chatbot.id,
                userId: credential.id,
                sessionId,
            }),
            message: dto.message,
            userId: credential.createdBy.id,
            chatSessionId: sessionId,
            signal: caller.signal,
        });

        return { data: { sessionId, ...answer } };
    }
}
