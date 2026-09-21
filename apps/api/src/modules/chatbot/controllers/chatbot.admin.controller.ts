import { PaginationQuery } from '@app/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from '@app/common/pagination/dtos/pagination.list.dto';
import { PaginationService } from '@app/common/pagination/services/pagination.service';
import {
    IResponse,
    IResponsePaging,
} from '@app/common/response/interfaces/response.interface';
import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';
import { ActivityService } from '@app/modules/activity/services/activity.service';
import { ApiKeySystemProtected } from '@app/modules/api-key/decorators/api-key.decorator';
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
import { Body, Controller, Delete, Get, Param, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import {
    Response,
    ResponsePaging,
} from 'src/common/response/decorators/response.decorator';
import { CHATBOT_SEARCHABLE_FIELDS } from '../constants/chatbot.list.constant';
import {
    ChatbotAdminDeleteDoc,
    ChatbotAdminGetDoc,
    ChatbotAdminListDoc,
    ChatbotAdminUpdateDoc,
} from '../docs/chatbot.admin.doc';
import { ChatbotUpdateRequestDto } from '../dtos/request/chatbot.update.request.dto';
import { ChatbotAdminResponseDto } from '../dtos/response/chatbot.admin.response.dto';
import { ChatbotService } from '../services/chatbot.service';

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
    @ApiKeySystemProtected()
    @Get('/')
    async findAll(
        @PaginationQuery({
            availableSearch: CHATBOT_SEARCHABLE_FIELDS,
        })
        { _search, _limit, _offset, _order }: PaginationListDto
    ): Promise<IResponsePaging<ChatbotAdminResponseDto>> {
        const find: Record<string, any> = {
            ..._search,
            deletedAt: null,
        };

        const chatbots = await this.chatbotService.findAll(find, {
            paging: {
                limit: _limit,
                offset: _offset,
            },
            order: _order,
            populate: ['workspace', 'account'],
        });

        const total: number = await this.chatbotService.getTotal(find);
        const totalPage: number = this.paginationService.totalPage(
            total,
            _limit
        );

        const data = chatbots.map(chatbot =>
            plainToInstance(ChatbotAdminResponseDto, chatbot)
        );

        return {
            _pagination: { total, totalPage },
            data,
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
    @ApiKeySystemProtected()
    @Get('/:id')
    async findOne(
        @Param('id') id: string
    ): Promise<IResponse<ChatbotAdminResponseDto>> {
        const chatbot = await this.chatbotService.findOne(
            {
                id: id,
                deletedAt: null,
            },
            {
                populate: ['workspace', 'account'],
            }
        );

        const responseData = plainToInstance(ChatbotAdminResponseDto, chatbot);
        return {
            data: responseData,
        };
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
    @ApiKeySystemProtected()
    @Put('/:id')
    async update(
        @Param('id') id: string,
        @Body() dto: ChatbotUpdateRequestDto,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<ChatbotAdminResponseDto>> {
        const chatbot = await this.chatbotService.findOne({
            id: id,
            deletedAt: null,
        });

        const updatedChatbot = await this.chatbotService.update(chatbot, dto);

        await this.activityService.createByUser(user, {
            action: ENUM_ACTIVITY_ACTION.UPDATE,
            subject: ENUM_POLICY_SUBJECT.CHATBOT,
            metadata: {
                id: updatedChatbot.id,
                name: updatedChatbot.name,
            },
        });

        const populatedChatbot = await this.chatbotService.findOne(
            {
                id: updatedChatbot.id,
            },
            {
                populate: ['workspace', 'account'],
            }
        );

        const responseData = plainToInstance(
            ChatbotAdminResponseDto,
            populatedChatbot
        );

        return {
            data: responseData,
        };
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
    @ApiKeySystemProtected()
    @Delete('/:id')
    async delete(
        @Param('id') id: string,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<ChatbotAdminResponseDto>> {
        const chatbot = await this.chatbotService.findOne({
            id: id,
            deletedAt: null,
        });

        const deletedChatbot = await this.chatbotService.softDelete(chatbot);

        await this.activityService.createByUser(user, {
            action: ENUM_ACTIVITY_ACTION.DELETE,
            subject: ENUM_POLICY_SUBJECT.CHATBOT,
            metadata: {
                id: deletedChatbot.id,
                name: deletedChatbot.name,
            },
        });

        const populatedChatbot = await this.chatbotService.findOne(
            {
                id: deletedChatbot.id,
            },
            {
                populate: ['workspace', 'account'],
            }
        );

        const responseData = plainToInstance(
            ChatbotAdminResponseDto,
            populatedChatbot
        );

        return {
            data: responseData,
        };
    }
}
