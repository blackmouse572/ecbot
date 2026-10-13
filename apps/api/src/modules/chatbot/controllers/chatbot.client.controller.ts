import { ENUM_APP_STATUS_CODE_ERROR } from '@app/app/enums/app.status-code.enum';
import {
    PaginationQuery,
    PaginationQueryFilterEqual,
    PaginationQueryFilterInEnum,
} from '@app/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from '@app/common/pagination/dtos/pagination.list.dto';
import { PaginationService } from '@app/common/pagination/services/pagination.service';
import {
    Response,
    ResponsePaging,
} from '@app/common/response/decorators/response.decorator';
import {
    IResponse,
    IResponsePaging,
} from '@app/common/response/interfaces/response.interface';
import { getDiffObject, pickDefinedFields } from '@app/common/utils/common';
import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';
import { ActivityService } from '@app/modules/activity/services/activity.service';
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
import {
    Body,
    Controller,
    Delete,
    Get,
    NotFoundException,
    Param,
    Post,
    Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    CHATBOT_ACCOUNT_FILTER_OPTIONS,
    CHATBOT_SEARCHABLE_FIELDS,
} from '../constants/chatbot.list.constant';
import { CHATBOT_EDITABLE_FIELDS } from '../constants/chatbot.update.constant';
import {
    ChatbotClientActiveDoc,
    ChatbotClientCreateDoc,
    ChatbotClientDeleteDoc,
    ChatbotClientGetDoc,
    ChatbotClientInactiveDoc,
    ChatbotClientListDoc,
    ChatbotClientModelsDoc,
    ChatbotClientUpdateDoc,
} from '../docs/chatbot.client.doc';
import { ChatbotCreateRequestDto } from '../dtos/request/chatbot.create.request.dto';
import { ChatbotUpdateRequestDto } from '../dtos/request/chatbot.update.request.dto';
import { ChatbotGetDetailResponseDto } from '../dtos/response/chatbot.detail.response.dto';
import { ChatbotListResponseDto } from '../dtos/response/chatbot.list.response.dto';
import { ChatbotModelResponseDto } from '../dtos/response/chatbot.model.response.dto';
import { ENUM_CHATBOT_STATUS, ENUM_CHATBOT_TYPE } from '../enums/chatbot.enum';
import { ChatbotEntity } from '../repository/entities/chatbot.entity';
import { ChatbotModelCatalogService } from '../services/chatbot-model-catalog.service';
import { ChatbotService } from '../services/chatbot.service';

// 3rd-party surface: authenticated by x-api-key (ClientCredential), tenant
// derived from the credential (no :workspace param). See ADR-0012. Writes
// act as the credential's creator, in the records and the activity log.
@ApiTags('modules.client.chatbot')
@Controller('/chatbots')
export class ChatbotClientController {
    constructor(
        private readonly chatbotService: ChatbotService,
        private readonly paginationService: PaginationService,
        private readonly modelCatalogService: ChatbotModelCatalogService,
        private readonly activityService: ActivityService
    ) {}

    @ChatbotClientListDoc()
    @ResponsePaging('chatbot.list')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.CHATBOT,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @Get('/')
    async findAll(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @PaginationQuery({
            availableSearch: CHATBOT_SEARCHABLE_FIELDS,
        })
        { _limit, _offset, _order, _search }: PaginationListDto,
        @PaginationQueryFilterInEnum('status', null, ENUM_CHATBOT_STATUS)
        status?: Record<string, any>,
        @PaginationQueryFilterInEnum('type', null, ENUM_CHATBOT_TYPE)
        types?: Record<string, any>,
        @PaginationQueryFilterEqual('accounts', CHATBOT_ACCOUNT_FILTER_OPTIONS)
        account?: Record<string, any>
    ): Promise<IResponsePaging<ChatbotListResponseDto>> {
        // The credential's workspace goes last so no filter can override it.
        const find: Record<string, any> = {
            ..._search,
            ...(status ?? {}),
            ...(types ?? {}),
            ...(account ?? {}),
            workspace: workspace.id,
            deletedAt: null,
        };

        const chatbots = await this.chatbotService.findAll(find, {
            paging: {
                limit: _limit,
                offset: _offset,
            },
            order: _order,
            populate: ['createdBy', 'accounts'],
            select: ['accounts.id'],
        });
        const total: number = await this.chatbotService.getTotal(find);

        return {
            _pagination: {
                total,
                totalPage: this.paginationService.totalPage(total, _limit),
            },
            data: this.chatbotService.mapList(chatbots),
        };
    }

    // Before /:id, so "models" is not read as a chatbot id.
    @ChatbotClientModelsDoc()
    @Response('chatbot.models')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.CHATBOT,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @Get('/models')
    async models(): Promise<IResponse<ChatbotModelResponseDto[]>> {
        return { data: await this.modelCatalogService.list() };
    }

    @ChatbotClientGetDoc()
    @Response('chatbot.get')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.CHATBOT,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @Get('/:id')
    async findOne(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('id') id: string
    ): Promise<IResponse<ChatbotGetDetailResponseDto>> {
        const chatbot = await this.chatbotService.findOne(
            { id, workspace: workspace.id, deletedAt: null },
            { populate: ['accounts', 'createdBy', 'updatedBy', 'workspace'] }
        );

        if (!chatbot) {
            throw new NotFoundException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'chatbot.error.notFound',
            });
        }

        return { data: this.chatbotService.mapDetails(chatbot) };
    }

    @ChatbotClientCreateDoc()
    @Response('chatbot.create')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.CHATBOT,
        action: [ENUM_POLICY_ACTION.CREATE],
    })
    @Post('/')
    async create(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @ClientCredentialPayload() credential: ClientCredentialEntity,
        @Body() dto: ChatbotCreateRequestDto
    ): Promise<IResponse<ChatbotListResponseDto>> {
        const chatbot = await this.chatbotService.create(
            { ...dto, workspace: workspace.id },
            { actionBy: credential.createdBy.id }
        );
        await this.log(ENUM_ACTIVITY_ACTION.CREATE, workspace, credential, {
            id: chatbot.id,
            name: chatbot.name,
        });

        return { data: this.chatbotService.mapList([chatbot])[0] };
    }

    @ChatbotClientUpdateDoc()
    @Response('chatbot.update')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.CHATBOT,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @Put('/:id')
    async update(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @ClientCredentialPayload() credential: ClientCredentialEntity,
        @Param('id') id: string,
        @Body() dto: ChatbotUpdateRequestDto
    ): Promise<IResponse<ChatbotListResponseDto>> {
        const chatbot = await this.findChatbotOrFail(workspace, id);

        // Merge: only the keys the body sent are written. Token caps aren't
        // editable here, as on the workspace route.
        const updated = await this.chatbotService.update(
            chatbot,
            pickDefinedFields(dto, CHATBOT_EDITABLE_FIELDS),
            { actionBy: credential.createdBy.id }
        );
        const diff = getDiffObject(chatbot, updated);
        await this.log(ENUM_ACTIVITY_ACTION.UPDATE, workspace, credential, {
            id: chatbot.id,
            name: chatbot.name,
            old: diff.old,
            new: diff.new,
        });

        return { data: this.chatbotService.mapList([updated])[0] };
    }

    @ChatbotClientActiveDoc()
    @Response('chatbot.active')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.CHATBOT,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @Post('/:id/active')
    async active(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @ClientCredentialPayload() credential: ClientCredentialEntity,
        @Param('id') id: string
    ): Promise<IResponse<ChatbotListResponseDto>> {
        const chatbot = await this.findChatbotOrFail(workspace, id);

        await this.chatbotService.active(chatbot, {
            actionBy: credential.createdBy.id,
        });
        await this.log(
            ENUM_ACTIVITY_ACTION.ACTIVE_CHATBOT,
            workspace,
            credential,
            { id: chatbot.id, name: chatbot.name }
        );

        return { data: this.chatbotService.mapList([chatbot])[0] };
    }

    @ChatbotClientInactiveDoc()
    @Response('chatbot.inactive')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.CHATBOT,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @Post('/:id/inactive')
    async inactive(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @ClientCredentialPayload() credential: ClientCredentialEntity,
        @Param('id') id: string
    ): Promise<IResponse<ChatbotListResponseDto>> {
        const chatbot = await this.findChatbotOrFail(workspace, id);

        await this.chatbotService.inactive(chatbot, {
            actionBy: credential.createdBy.id,
        });
        await this.log(
            ENUM_ACTIVITY_ACTION.INACTIVE_CHATBOT,
            workspace,
            credential,
            { id: chatbot.id, name: chatbot.name }
        );

        return { data: this.chatbotService.mapList([chatbot])[0] };
    }

    // UPDATE, not DELETE: the same ability the workspace route requires.
    @ChatbotClientDeleteDoc()
    @Response('chatbot.delete')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.CHATBOT,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @Delete('/:id')
    async delete(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @ClientCredentialPayload() credential: ClientCredentialEntity,
        @Param('id') id: string
    ): Promise<IResponse<ChatbotListResponseDto>> {
        const chatbot = await this.findChatbotOrFail(workspace, id);

        const deleted = await this.chatbotService.softDelete(chatbot, {
            actionBy: credential.createdBy.id,
        });
        await this.log(ENUM_ACTIVITY_ACTION.DELETE, workspace, credential, {
            id: chatbot.id,
            name: chatbot.name,
        });

        return { data: this.chatbotService.mapList([deleted])[0] };
    }

    // Missing, deleted and cross-workspace look the same: 404.
    private async findChatbotOrFail(
        workspace: WorkspaceEntity,
        id: string
    ): Promise<ChatbotEntity> {
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
        return chatbot;
    }

    private async log(
        action: ENUM_ACTIVITY_ACTION,
        workspace: WorkspaceEntity,
        credential: ClientCredentialEntity,
        metadata: Record<string, unknown>
    ): Promise<void> {
        await this.activityService.createByUserWithWorkspace(
            credential.createdBy,
            workspace,
            { action, subject: ENUM_POLICY_SUBJECT.CHATBOT, metadata }
        );
    }
}
