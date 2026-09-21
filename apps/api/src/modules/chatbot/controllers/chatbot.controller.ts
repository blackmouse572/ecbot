import { ENUM_APP_STATUS_CODE_ERROR } from '@app/app/enums/app.status-code.enum';
import {
    BatchIdsRequestDto,
    BatchIdsWithActiveRequestDto,
} from '@app/common/batch/dtos/batch.request.dto';
import { BatchResultResponseDto } from '@app/common/batch/dtos/batch.response.dto';
import { runBatch } from '@app/common/batch/utils/run-batch.util';
import { ChatbotEntity } from '@app/modules/chatbot/repository/entities/chatbot.entity';
import {
    PaginationQuery,
    PaginationQueryFilterEqual,
    PaginationQueryFilterInEnum,
} from '@app/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from '@app/common/pagination/dtos/pagination.list.dto';
import { PaginationService } from '@app/common/pagination/services/pagination.service';
import {
    IResponse,
    IResponsePaging,
} from '@app/common/response/interfaces/response.interface';
import { getDiffObject, pickFields } from '@app/common/utils/common';
import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';
import { ActivityService } from '@app/modules/activity/services/activity.service';
import { ApiKeyProtected } from '@app/modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@app/modules/auth/decorators/auth.jwt.decorator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '@app/modules/policy/enums/policy.enum';
import { UserProtected } from '@app/modules/user/decorators/user.decorator';
import { UserParsePipe } from '@app/modules/user/pipes/user.parse.pipe';
import { UserEntity } from '@app/modules/user/repository/entities/user.entity';
import {
    WorkspacePayload,
    WorkspacePolicyAbilityProtected,
} from '@app/modules/workspace/decorators/workspace.decorator';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import {
    Body,
    Controller,
    Delete,
    Get,
    Logger,
    NotFoundException,
    Param,
    Post,
    Put,
    Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    Response,
    ResponsePaging,
} from 'src/common/response/decorators/response.decorator';
import {
    CHATBOT_ACCOUNT_FILTER_OPTIONS,
    CHATBOT_SEARCHABLE_FIELDS,
} from '../constants/chatbot.list.constant';
import { CHATBOT_EDITABLE_FIELDS } from '../constants/chatbot.update.constant';
import {
    ChatbotActiveDoc,
    ChatbotArchiveDoc,
    ChatbotBatchDeleteDoc,
    ChatbotBatchStatusDoc,
    ChatbotCreateDoc,
    ChatbotDeleteDoc,
    ChatbotGetDoc,
    ChatbotInactiveDoc,
    ChatbotLinkAccountDoc,
    ChatbotListDoc,
    ChatbotModelsDoc,
    ChatbotCloneDoc,
    ChatbotCreateShareLinkDoc,
    ChatbotStreamDoc,
    ChatbotUnlinkAccountDoc,
    ChatbotUpdateDoc,
} from '../docs/chatbot.doc';
import { CloneChatbotRequestDto } from '../dtos/request/chatbot.clone.request.dto';
import { ChatbotCreateRequestDto } from '../dtos/request/chatbot.create.request.dto';
import { ChatbotLinkAccountRequestDto } from '../dtos/request/chatbot.link-account.request.dto';
import { ChatbotUpdateRequestDto } from '../dtos/request/chatbot.update.request.dto';
import { ChatbotGetDetailResponseDto } from '../dtos/response/chatbot.detail.response.dto';
import { ChatbotListResponseDto } from '../dtos/response/chatbot.list.response.dto';
import { ChatbotModelResponseDto } from '../dtos/response/chatbot.model.response.dto';
import { ENUM_CHATBOT_STATUS, ENUM_CHATBOT_TYPE } from '../enums/chatbot.enum';
import { ChatbotService } from '../services/chatbot.service';
import type { Response as ExpressResponse } from 'express';
import { IAuthJwtAccessTokenPayload } from '@app/modules/auth/interfaces/auth.interface';
import { ChatbotStreamRequestDto } from '../dtos/request/chatbot.stream.request.dto';
import {
    CHATBOT_SHARE_LINK_EXPIRY_MS,
    ChatbotShareLinkRequestDto,
    ENUM_CHATBOT_SHARE_LINK_EXPIRY,
} from '../dtos/request/chatbot.share-link.request.dto';
import { ChatbotShareLinkResponseDto } from '../dtos/response/chatbot.share-link.response.dto';
import { ChatbotShareTokenService } from '../services/chatbot-share-token.service';
import { ConfigService } from '@nestjs/config';
import { RequestTimeout } from 'src/common/request/decorators/request.decorator';
import { ChatbotModelCatalogService } from '../services/chatbot-model-catalog.service';
import { ChatbotPreviewService } from '../services/chatbot-preview.service';
import { ChatbotPreviewSessionService } from '../services/chatbot-preview-session.service';
import { ManifestBuilderService } from '@app/modules/tool/services/manifest-builder.service';
import { ChatbotAIService } from '../services/chatbot-ai.service';

@ApiTags('modules.user.chatbot')
@Controller('/:workspace/chatbots')
export class ChatbotController {
    private readonly logger = new Logger(ChatbotController.name);

    constructor(
        private readonly chatbotService: ChatbotService,
        private readonly paginationService: PaginationService,
        private readonly activityService: ActivityService,
        private readonly chatbotAIService: ChatbotAIService,
        private readonly manifestBuilder: ManifestBuilderService,
        private readonly previewService: ChatbotPreviewService,
        private readonly previewSessionService: ChatbotPreviewSessionService,
        private readonly shareTokenService: ChatbotShareTokenService,
        private readonly configService: ConfigService,
        private readonly modelCatalogService: ChatbotModelCatalogService
    ) {}

    @ChatbotListDoc()
    @ResponsePaging('chatbot.list')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.CHATBOT,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
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
        const find: Record<string, any> = {
            ..._search,
            workspace: workspace.id,
            deletedAt: null,
            ...(status ?? {}),
            ...(types ?? {}),
            ...(account ?? {}),
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
        const totalPage: number = this.paginationService.totalPage(
            total,
            _limit
        );

        const mapped = this.chatbotService.mapList(chatbots);

        return {
            _pagination: { total, totalPage },
            data: mapped,
        };
    }

    @ChatbotModelsDoc()
    @Response('chatbot.models')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.CHATBOT,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/models')
    async models(): Promise<IResponse<ChatbotModelResponseDto[]>> {
        return { data: await this.modelCatalogService.list() };
    }

    @ChatbotGetDoc()
    @Response('chatbot.get')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.CHATBOT,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/:id')
    async findOne(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('id') id: string
    ): Promise<IResponse<ChatbotGetDetailResponseDto>> {
        const chatbot = await this.chatbotService.findOne(
            {
                id: id,
                workspace: workspace.id,
                deletedAt: null,
            },
            {
                populate: ['accounts', 'createdBy', 'updatedBy', 'workspace'],
            }
        );

        if (!chatbot) {
            throw new NotFoundException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'chatbot.error.notFound',
            });
        }

        return {
            data: this.chatbotService.mapDetails(chatbot),
        };
    }

    @ChatbotCreateDoc()
    @Response('chatbot.create')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.CHATBOT,
        action: [ENUM_POLICY_ACTION.CREATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/')
    async create(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Body() dto: ChatbotCreateRequestDto,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<ChatbotListResponseDto>> {
        // Ensure the chatbot is associated with the current workspace
        dto.workspace = workspace.id;
        const chatbot = await this.chatbotService.create(dto, {
            actionBy: user.id,
        });
        await this.activityService.createByUserWithWorkspace(user, workspace, {
            action: ENUM_ACTIVITY_ACTION.CREATE,
            subject: ENUM_POLICY_SUBJECT.CHATBOT,
            metadata: {
                id: chatbot.id,
                name: chatbot.name,
            },
        });
        return {
            data: this.chatbotService.mapList([chatbot])[0],
        };
    }

    @ChatbotUpdateDoc()
    @Response('chatbot.update')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.CHATBOT,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/:id')
    async update(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('id') id: string,
        @Body() dto: ChatbotUpdateRequestDto,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<ChatbotListResponseDto>> {
        const chatbot = await this.chatbotService.findOne({
            id: id,
            workspace: workspace.id,
            deletedAt: null,
        });
        if (!chatbot) {
            throw new NotFoundException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'chatbot.error.notFound',
            });
        }

        // Token caps aren't editable through this endpoint yet.
        const editableFields = pickFields(dto, CHATBOT_EDITABLE_FIELDS);

        const updatedChatbot = await this.chatbotService.update(
            chatbot,
            editableFields,
            {
                actionBy: user.id,
            }
        );

        const diff = getDiffObject(chatbot, updatedChatbot);
        await this.activityService.createByUserWithWorkspace(user, workspace, {
            action: ENUM_ACTIVITY_ACTION.UPDATE,
            subject: ENUM_POLICY_SUBJECT.CHATBOT,
            metadata: {
                id: chatbot.id,
                name: chatbot.name,
                old: diff.old,
                new: diff.new,
            },
        });
        return {
            data: this.chatbotService.mapList([updatedChatbot])[0],
        };
    }

    @ChatbotBatchDeleteDoc()
    @Response('chatbot.batchDelete')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.CHATBOT,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/batch/delete')
    async batchDelete(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity,
        @Body() { ids }: BatchIdsRequestDto
    ): Promise<IResponse<BatchResultResponseDto>> {
        const data = await runBatch(ids, async id => {
            const chatbot = await this.findOneOwnedOrFail(workspace, id);

            await this.chatbotService.softDelete(chatbot, {
                actionBy: user.id,
            });
            await this.activityService.createByUserWithWorkspace(
                user,
                workspace,
                {
                    action: ENUM_ACTIVITY_ACTION.DELETE,
                    subject: ENUM_POLICY_SUBJECT.CHATBOT,
                    metadata: { id: chatbot.id, name: chatbot.name },
                }
            );
        });

        return { data };
    }

    @ChatbotBatchStatusDoc()
    @Response('chatbot.batchStatus')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.CHATBOT,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/batch/status')
    async batchStatus(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity,
        @Body() { ids, active }: BatchIdsWithActiveRequestDto
    ): Promise<IResponse<BatchResultResponseDto>> {
        const data = await runBatch(ids, async id => {
            const chatbot = await this.findOneOwnedOrFail(workspace, id);

            if (active) {
                await this.chatbotService.active(chatbot, {
                    actionBy: user.id,
                });
            } else {
                await this.chatbotService.inactive(chatbot, {
                    actionBy: user.id,
                });
            }

            await this.activityService.createByUserWithWorkspace(
                user,
                workspace,
                {
                    action: active
                        ? ENUM_ACTIVITY_ACTION.ACTIVE_CHATBOT
                        : ENUM_ACTIVITY_ACTION.INACTIVE_CHATBOT,
                    subject: ENUM_POLICY_SUBJECT.CHATBOT,
                    metadata: { id: chatbot.id, name: chatbot.name },
                }
            );
        });

        return { data };
    }

    @ChatbotDeleteDoc()
    @Response('chatbot.delete')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.CHATBOT,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/:id')
    async delete(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity,
        @Param('id') id: string
    ): Promise<IResponse<ChatbotListResponseDto>> {
        const chatbot = await this.chatbotService.findOne({
            id: id,
            workspace: workspace.id,
            deletedAt: null,
        });
        if (!chatbot) {
            throw new NotFoundException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'chatbot.error.notFound',
            });
        }

        const deletedChatbot = await this.chatbotService.softDelete(chatbot, {
            actionBy: user.id,
        });
        await this.activityService.createByUserWithWorkspace(user, workspace, {
            action: ENUM_ACTIVITY_ACTION.DELETE,
            subject: ENUM_POLICY_SUBJECT.CHATBOT,
            metadata: {
                id: chatbot.id,
                name: chatbot.name,
            },
        });
        return {
            data: this.chatbotService.mapList([deletedChatbot])[0],
        };
    }

    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.CHATBOT,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @ChatbotStreamDoc()
    @RequestTimeout('300s')
    @Post('/:id/stream')
    async stream(
        @Res() res: ExpressResponse,
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('id') id: string,
        @AuthJwtPayload() payload: IAuthJwtAccessTokenPayload,
        @Body() dto: ChatbotStreamRequestDto
    ): Promise<void> {
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

        // Operators preview inactive and archived bots on purpose — the status
        // gate belongs on the public share-link path only.
        await this.previewService.streamTo(res, {
            chatbot,
            sessionKey: this.previewSessionService.workspaceKey({
                workspaceId: workspace.id,
                chatbotId: chatbot.id,
                userId: payload.user,
                sessionId: dto.chat_session_id ?? id,
            }),
            message: dto.message,
            userId: payload.user,
            chatSessionId: dto.chat_session_id,
        });
    }

    @ChatbotCreateShareLinkDoc()
    @Response('chatbot.shareLink')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.CHATBOT,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/:id/share-link')
    async createShareLink(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('id') id: string,
        @Body() dto: ChatbotShareLinkRequestDto
    ): Promise<IResponse<ChatbotShareLinkResponseDto>> {
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

        const { token, expiresAt } = this.shareTokenService.create({
            chatbotId: chatbot.id,
            workspaceId: workspace.id,
            expiresInMs:
                CHATBOT_SHARE_LINK_EXPIRY_MS[
                    dto.expiresIn ?? ENUM_CHATBOT_SHARE_LINK_EXPIRY.ONE_DAY
                ],
        });

        const frontendUrl = (
            this.configService.get<string>('home.url') ?? ''
        ).replace(/\/$/, '');

        return { data: { url: `${frontendUrl}/preview/${token}`, expiresAt } };
    }

    @ChatbotActiveDoc()
    @Response('chatbot.active')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.CHATBOT,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/:id/active')
    async active(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('id') id: string,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<ChatbotListResponseDto>> {
        const chatbot = await this.chatbotService.findOne({
            id: id,
            workspace: workspace.id,
            deletedAt: null,
        });

        if (!chatbot) {
            throw new NotFoundException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'chatbot.error.notFound',
            });
        }

        await this.chatbotService.active(chatbot, {
            actionBy: user.id,
        });
        await this.activityService.createByUserWithWorkspace(user, workspace, {
            action: ENUM_ACTIVITY_ACTION.ACTIVE_CHATBOT,
            subject: ENUM_POLICY_SUBJECT.CHATBOT,
            metadata: {
                id: chatbot.id,
                name: chatbot.name,
            },
        });
        return {
            data: this.chatbotService.mapList([chatbot])[0],
        };
    }

    @ChatbotInactiveDoc()
    @Response('chatbot.inactive')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.CHATBOT,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/:id/inactive')
    async inactive(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('id') id: string,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<ChatbotListResponseDto>> {
        const chatbot = await this.chatbotService.findOne({
            id: id,
            workspace: workspace.id,
            deletedAt: null,
        });

        if (!chatbot) {
            throw new NotFoundException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'chatbot.error.notFound',
            });
        }

        await this.chatbotService.inactive(chatbot, {
            actionBy: user.id,
        });
        await this.activityService.createByUserWithWorkspace(user, workspace, {
            action: ENUM_ACTIVITY_ACTION.INACTIVE_CHATBOT,
            subject: ENUM_POLICY_SUBJECT.CHATBOT,
            metadata: {
                id: chatbot.id,
                name: chatbot.name,
            },
        });
        return {
            data: this.chatbotService.mapList([chatbot])[0],
        };
    }

    @ChatbotArchiveDoc()
    @Response('chatbot.archive')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.CHATBOT,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/:id/archive')
    async archive(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('id') id: string,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<ChatbotListResponseDto>> {
        const chatbot = await this.chatbotService.findOne({
            id: id,
            workspace: workspace.id,
            deletedAt: null,
        });

        if (!chatbot) {
            throw new NotFoundException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'chatbot.error.notFound',
            });
        }

        await this.chatbotService.archive(chatbot, {
            actionBy: user.id,
        });
        await this.activityService.createByUserWithWorkspace(user, workspace, {
            action: ENUM_ACTIVITY_ACTION.ARCHIVE_CHATBOT,
            subject: ENUM_POLICY_SUBJECT.CHATBOT,
            metadata: {
                id: chatbot.id,
                name: chatbot.name,
            },
        });
        return {
            data: this.chatbotService.mapList([chatbot])[0],
        };
    }

    @ChatbotLinkAccountDoc()
    @Response('chatbot.linkAccount')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.CHATBOT,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/:id/link-account')
    async linkAccount(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('id') id: string,
        @Body() body: ChatbotLinkAccountRequestDto,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<ChatbotListResponseDto>> {
        const chatbot = await this.chatbotService.findOne({
            id: id,
            workspace: workspace.id,
            deletedAt: null,
        });

        if (!chatbot) {
            throw new NotFoundException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'chatbot.error.notFound',
            });
        }

        const updatedChatbot = await this.chatbotService.linkBatchAccounts(
            chatbot,
            body.accounts,
            {
                actionBy: user.id,
            }
        );
        await this.activityService.createByUserWithWorkspace(user, workspace, {
            action: ENUM_ACTIVITY_ACTION.LINK_ACCOUNT_CHATBOT,
            subject: ENUM_POLICY_SUBJECT.CHATBOT,
            metadata: {
                id: chatbot.id,
                name: chatbot.name,
            },
        });
        return {
            data: this.chatbotService.mapList([updatedChatbot])[0],
        };
    }

    @ChatbotUnlinkAccountDoc()
    @Response('chatbot.unlinkAccount')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.CHATBOT,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/:id/unlink-account')
    async unlinkAccount(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('id') id: string,
        @Body() body: ChatbotLinkAccountRequestDto,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<ChatbotListResponseDto>> {
        const chatbot = await this.chatbotService.findOne({
            id: id,
            workspace: workspace.id,
            deletedAt: null,
        });

        if (!chatbot) {
            throw new NotFoundException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'chatbot.error.notFound',
            });
        }

        const updatedChatbot = await this.chatbotService.unlinkBatchAccounts(
            chatbot,
            body.accounts,
            {
                actionBy: user.id,
            }
        );
        await this.activityService.createByUserWithWorkspace(user, workspace, {
            action: ENUM_ACTIVITY_ACTION.UNLINK_ACCOUNT_CHATBOT,
            subject: ENUM_POLICY_SUBJECT.CHATBOT,
            metadata: {
                id: chatbot.id,
                name: chatbot.name,
            },
        });
        return {
            data: this.chatbotService.mapList([updatedChatbot])[0],
        };
    }

    @ChatbotCloneDoc()
    @Response('chatbot.clone')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.CHATBOT,
        action: [ENUM_POLICY_ACTION.CREATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/:id/clone')
    async clone(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('id') id: string,
        @Body() dto: CloneChatbotRequestDto,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<ChatbotListResponseDto>> {
        // Load source first so the audit log records the source's real name
        // (clone() re-validates and throws NotFound if it's missing).
        const source = await this.chatbotService.findOne({
            id,
            workspace: workspace.id,
            deletedAt: null,
        });
        const cloned = await this.chatbotService.clone(id, workspace.id, dto, {
            actionBy: user.id,
        });
        await this.activityService.createByUserWithWorkspace(user, workspace, {
            action: ENUM_ACTIVITY_ACTION.CLONE_CHATBOT,
            subject: ENUM_POLICY_SUBJECT.CHATBOT,
            metadata: {
                sourceId: id,
                sourceName: source?.name,
                newId: cloned.id,
                newName: cloned.name,
            },
        });
        return {
            data: this.chatbotService.mapList([cloned])[0],
        };
    }

    // Shared by the batch endpoints: same lookup + 404 the single-item
    // endpoints do, so a bad id becomes one `failed` entry instead of
    // aborting the whole batch.
    private async findOneOwnedOrFail(
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
}
