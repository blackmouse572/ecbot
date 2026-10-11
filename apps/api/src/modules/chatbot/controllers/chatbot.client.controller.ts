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
import { ClientCredentialProtected } from '@app/modules/client-credential/decorators/client-credential.decorator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '@app/modules/policy/enums/policy.enum';
import { WorkspacePayload } from '@app/modules/workspace/decorators/workspace.decorator';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    CHATBOT_ACCOUNT_FILTER_OPTIONS,
    CHATBOT_SEARCHABLE_FIELDS,
} from '../constants/chatbot.list.constant';
import {
    ChatbotClientGetDoc,
    ChatbotClientListDoc,
} from '../docs/chatbot.client.doc';
import { ChatbotGetDetailResponseDto } from '../dtos/response/chatbot.detail.response.dto';
import { ChatbotListResponseDto } from '../dtos/response/chatbot.list.response.dto';
import { ENUM_CHATBOT_STATUS, ENUM_CHATBOT_TYPE } from '../enums/chatbot.enum';
import { ChatbotService } from '../services/chatbot.service';

// 3rd-party surface: authenticated by x-api-key (ClientCredential), tenant
// derived from the credential (no :workspace param). See ADR-0012.
@ApiTags('modules.client.chatbot')
@Controller('/chatbots')
export class ChatbotClientController {
    constructor(
        private readonly chatbotService: ChatbotService,
        private readonly paginationService: PaginationService
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
}
