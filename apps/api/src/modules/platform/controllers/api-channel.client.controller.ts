import { Response } from '@app/common/response/decorators/response.decorator';
import { IResponse } from '@app/common/response/interfaces/response.interface';
import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { AccountService } from '@app/modules/account/services/account.service';
import { ClientCredentialProtected } from '@app/modules/client-credential/decorators/client-credential.decorator';
import { WorkspacePayload } from '@app/modules/workspace/decorators/workspace.decorator';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Logger,
    NotFoundException,
    Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PlatformAdapterRegistry } from '../services/platform-adapter.registry';
import { ChannelRateLimitService } from '../services/channel-rate-limit.service';
import { InboundInboxService } from '../services/inbound-inbox.service';
import { ApiChannelSendMessageRequestDto } from '../dtos/request/api-channel.send-message.request.dto';
import { ApiChannelSendMessageResponseDto } from '../dtos/response/api-channel.send-message.response.dto';
import { ApiChannelSendMessageDoc } from '../docs/api-channel.client.doc';
import { ENUM_API_CHANNEL_STATUS_CODE_ERROR } from '../enums/api-channel.status-code.enum';

/** Per-credential ceiling. Generous for a chat integration, ruinous for a loop. */
const RATE_LIMIT_PER_MINUTE = 120;
const RATE_LIMIT_WINDOW_SECONDS = 60;

/**
 * Inbound entry point for the API channel.
 *
 * Lives on `/client` (ADR-0012): the caller authenticates with a workspace-owned
 * ClientCredential and the tenant comes from that credential, never from the
 * URL — so an `accountKey` naming another workspace's account simply isn't found.
 * The reply is not returned here; it is POSTed to the account's callback URL
 * once the chatbot has generated it.
 */
@ApiTags('modules.client.apiChannel')
@Controller({ version: '1', path: '/channels/api' })
export class ApiChannelClientController {
    private readonly logger = new Logger(ApiChannelClientController.name);

    constructor(
        private readonly accountService: AccountService,
        private readonly registry: PlatformAdapterRegistry,
        private readonly inbox: InboundInboxService,
        private readonly rateLimit: ChannelRateLimitService
    ) {}

    @ApiChannelSendMessageDoc()
    @Response('apiChannel.sendMessage')
    @ClientCredentialProtected()
    @Post('/messages')
    async sendMessage(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Body() dto: ApiChannelSendMessageRequestDto
    ): Promise<IResponse<ApiChannelSendMessageResponseDto>> {
        const within = await this.rateLimit.claim(
            `api:${workspace.id}:${dto.accountKey}`,
            RATE_LIMIT_PER_MINUTE,
            RATE_LIMIT_WINDOW_SECONDS
        );
        if (!within) {
            throw new HttpException(
                {
                    statusCode:
                        ENUM_API_CHANNEL_STATUS_CODE_ERROR.RATE_LIMITED,
                    message: 'apiChannel.error.rateLimited',
                },
                HttpStatus.TOO_MANY_REQUESTS
            );
        }

        // Scoping by workspace is the tenancy check: the credential decides the
        // workspace, so an accountKey from another tenant resolves to nothing.
        const account = await this.accountService.findOne({
            externalId: dto.accountKey,
            workspace: workspace.id,
            type: ENUM_ACCOUNT_TYPE.API_CHANNEL,
        });
        if (!account) {
            throw new NotFoundException({
                statusCode:
                    ENUM_API_CHANNEL_STATUS_CODE_ERROR.ACCOUNT_NOT_FOUND,
                message: 'apiChannel.error.accountNotFound',
            });
        }

        const adapter = this.registry.get(ENUM_ACCOUNT_TYPE.API_CHANNEL);
        const [event] = adapter.parse(JSON.stringify(dto));
        if (!event) {
            throw new HttpException(
                {
                    statusCode:
                        ENUM_API_CHANNEL_STATUS_CODE_ERROR.UNPROCESSABLE_MESSAGE,
                    message: 'apiChannel.error.unprocessableMessage',
                },
                HttpStatus.UNPROCESSABLE_ENTITY
            );
        }

        // Receipt-before-ACK (ADR-0007): make the event durable before replying,
        // so a crash here never drops a message the caller believes we took.
        await this.inbox.accept(adapter.type, event);

        this.logger.log(
            `API channel message accepted: workspace=${workspace.id} account=${account.id} mid=${event.externalMessageId}`
        );

        return {
            data: {
                accepted: true,
                messageId: event.externalMessageId!,
            },
        };
    }
}
