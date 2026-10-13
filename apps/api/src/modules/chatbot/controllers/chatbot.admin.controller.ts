import {
    PaginationQuery,
    PaginationQueryFilterEqual,
    PaginationQueryFilterInEnum,
} from '@app/common/pagination/decorators/pagination.decorator';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from '@app/common/pagination/enums/pagination.enum';
import { ENUM_APP_STATUS_CODE_ERROR } from '@app/app/enums/app.status-code.enum';
import { PaginationListDto } from '@app/common/pagination/dtos/pagination.list.dto';
import { PaginationService } from '@app/common/pagination/services/pagination.service';
import {
    IResponse,
    IResponsePaging,
} from '@app/common/response/interfaces/response.interface';
import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';
import { ActivityService } from '@app/modules/activity/services/activity.service';
import { ApiKeyProtected } from '@app/modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@app/modules/auth/decorators/auth.jwt.decorator';
import {
    PolicyAbilityProtected,
    PolicyRoleProtected,
} from '@app/modules/policy/decorators/policy.decorator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from '@app/modules/policy/enums/policy.enum';
import { UserProtected } from '@app/modules/user/decorators/user.decorator';
import { UserParsePipe } from '@app/modules/user/pipes/user.parse.pipe';
import { UserEntity } from '@app/modules/user/repository/entities/user.entity';
import {
    Body,
    Controller,
    Delete,
    Get,
    NotFoundException,
    Param,
    ParseUUIDPipe,
    Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    Response,
    ResponsePaging,
} from 'src/common/response/decorators/response.decorator';
import {
    CHATBOT_DEFAULT_AVAILABLE_SORT,
    CHATBOT_SEARCHABLE_FIELDS,
} from '../constants/chatbot.list.constant';
import {
    ChatbotAdminDeleteDoc,
    ChatbotAdminGetDoc,
    ChatbotAdminListDoc,
    ChatbotAdminUpdateDoc,
} from '../docs/chatbot.admin.doc';
import { ChatbotUpdateRequestDto } from '../dtos/request/chatbot.update.request.dto';
import { ChatbotAdminResponseDto } from '../dtos/response/chatbot.admin.response.dto';
import { ENUM_CHATBOT_STATUS, ENUM_CHATBOT_TYPE } from '../enums/chatbot.enum';
import { ChatbotEntity } from '../repository/entities/chatbot.entity';
import { ChatbotService } from '../services/chatbot.service';

// `accounts` is the relation's name; populating `account` made MikroORM throw.
const CHATBOT_ADMIN_POPULATE = ['workspace', 'accounts'] as const;

@ApiTags('modules.admin.chatbot')
@Controller({
    version: '1',
    path: '/chatbots',
})
export class ChatbotAdminController {
    constructor(
        private readonly chatbotService: ChatbotService,
        private readonly paginationService: PaginationService,
        private readonly activityService: ActivityService
    ) {}

    @ChatbotAdminListDoc()
    @ResponsePaging('chatbot.admin.list')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.CHATBOT,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/')
    async findAll(
        @PaginationQuery({
            availableSearch: CHATBOT_SEARCHABLE_FIELDS,
            availableOrderBy: CHATBOT_DEFAULT_AVAILABLE_SORT,
            defaultOrderBy: 'createdAt',
            defaultOrderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC,
        })
        { _search, _limit, _offset, _order }: PaginationListDto,
        @PaginationQueryFilterInEnum('status', null, ENUM_CHATBOT_STATUS)
        status?: Record<string, any>,
        @PaginationQueryFilterInEnum('type', null, ENUM_CHATBOT_TYPE)
        type?: Record<string, any>,
        @PaginationQueryFilterEqual('workspace')
        workspace?: Record<string, any>
    ): Promise<IResponsePaging<ChatbotAdminResponseDto>> {
        const find: Record<string, any> = {
            ..._search,
            deletedAt: null,
            ...(status ?? {}),
            ...(type ?? {}),
            ...(workspace ?? {}),
        };

        const [chatbots, total] = await Promise.all([
            this.chatbotService.findAll(find, {
                paging: {
                    limit: _limit,
                    offset: _offset,
                },
                order: _order,
                populate: [...CHATBOT_ADMIN_POPULATE],
            }),
            this.chatbotService.getTotal(find),
        ]);
        const totalPage: number = this.paginationService.totalPage(
            total,
            _limit
        );

        return {
            _pagination: { total, totalPage },
            data: chatbots.map(chatbot =>
                this.chatbotService.mapDetails(chatbot)
            ),
        };
    }

    @ChatbotAdminGetDoc()
    @Response('chatbot.admin.get')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.CHATBOT,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/:id')
    async findOne(
        @Param('id', ParseUUIDPipe) id: string
    ): Promise<IResponse<ChatbotAdminResponseDto>> {
        const chatbot = await this.findOrFail(id);
        return { data: this.chatbotService.mapDetails(chatbot) };
    }

    @ChatbotAdminUpdateDoc()
    @Response('chatbot.admin.update')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.CHATBOT,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/:id')
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: ChatbotUpdateRequestDto,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<ChatbotAdminResponseDto>> {
        const chatbot = await this.findOrFail(id);
        const updatedChatbot = await this.chatbotService.update(chatbot, dto);

        await this.activityService.createByUser(user, {
            action: ENUM_ACTIVITY_ACTION.UPDATE,
            subject: ENUM_POLICY_SUBJECT.CHATBOT,
            metadata: {
                id: updatedChatbot.id,
                name: updatedChatbot.name,
            },
        });

        const populated = await this.findOrFail(updatedChatbot.id);
        return { data: this.chatbotService.mapDetails(populated) };
    }

    @ChatbotAdminDeleteDoc()
    @Response('chatbot.admin.delete')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.CHATBOT,
        action: [ENUM_POLICY_ACTION.DELETE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/:id')
    async delete(
        @Param('id', ParseUUIDPipe) id: string,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<ChatbotAdminResponseDto>> {
        const chatbot = await this.findOrFail(id);
        const deletedChatbot = await this.chatbotService.softDelete(chatbot);

        await this.activityService.createByUser(user, {
            action: ENUM_ACTIVITY_ACTION.DELETE,
            subject: ENUM_POLICY_SUBJECT.CHATBOT,
            metadata: {
                id: deletedChatbot.id,
                name: deletedChatbot.name,
            },
        });

        return { data: this.chatbotService.mapDetails(chatbot) };
    }

    private async findOrFail(id: string): Promise<ChatbotEntity> {
        const chatbot = await this.chatbotService.findOne(
            { id, deletedAt: null },
            { populate: [...CHATBOT_ADMIN_POPULATE] }
        );
        if (!chatbot) {
            throw new NotFoundException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'chatbot.error.notFound',
            });
        }
        return chatbot;
    }
}
