import { BatchIdsRequestDto } from '@app/common/batch/dtos/batch.request.dto';
import { BatchResultResponseDto } from '@app/common/batch/dtos/batch.response.dto';
import { runBatch } from '@app/common/batch/utils/run-batch.util';
import { PaginationQuery } from '@app/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from '@app/common/pagination/dtos/pagination.list.dto';
import { PaginationService } from '@app/common/pagination/services/pagination.service';
import {
    IResponse,
    IResponsePaging,
} from '@app/common/response/interfaces/response.interface';
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
    WorkspaceScopedProtected,
} from '@app/modules/workspace/decorators/workspace.decorator';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import {
    Body,
    ConflictException,
    Controller,
    Delete,
    Get,
    NotFoundException,
    Param,
    Post,
    Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    Response,
    ResponsePaging,
} from 'src/common/response/decorators/response.decorator';
import { ApiKeyProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from 'src/modules/auth/decorators/auth.jwt.decorator';
import { ACCOUNT_SEARCHABLE_FIELDS } from '../constants/account.list.constant';
import { AccountChatbotQueryFilter } from '../decorator/account.filter.decorator';
import {
    AccountBatchDeleteSyncDoc,
    AccountGetDoc,
    AccountLinkDoc,
    AccountListDoc,
    AccountListUnlinkedDoc,
    AccountProvisionApiChannelDoc,
    AccountProvisionWebsiteWidgetDoc,
    AccountRotateApiChannelSecretDoc,
    AccountUpdateAllowedOriginsDoc,
    AccountUpdateCallbackUrlDoc,
    DeleteSyncAccountDoc,
} from '../docs/account.doc';
import { AccountLinkRequestDto } from '../dtos/request/account.link.request.dto';
import { AccountProvisionApiChannelRequestDto } from '../dtos/request/account.provision-api-channel.request.dto';
import { AccountProvisionApiChannelResponseDto } from '../dtos/response/account.provision-api-channel.response.dto';
import { AccountProvisionWebsiteWidgetRequestDto } from '../dtos/request/account.provision-website-widget.request.dto';
import { AccountProvisionWebsiteWidgetResponseDto } from '../dtos/response/account.provision-website-widget.response.dto';
import { AccountUpdateCallbackUrlRequestDto } from '../dtos/request/account.update-callback-url.request.dto';
import { AccountUpdateCallbackUrlResponseDto } from '../dtos/response/account.update-callback-url.response.dto';
import { AccountUpdateAllowedOriginsRequestDto } from '../dtos/request/account.update-allowed-origins.request.dto';
import { AccountUpdateAllowedOriginsResponseDto } from '../dtos/response/account.update-allowed-origins.response.dto';
import {
    AccountListQueryDto,
    accountListFilter,
} from '../dtos/request/account.list.request.dto';
import { AccountGetDetailResponseDto } from '../dtos/response/account.detail.response.dto';
import { AccountLinkResponseDto } from '../dtos/response/account.link.response.dto';
import { AccountListResponseDto } from '../dtos/response/account.list.response.dto';
import { ENUM_ACCOUNT_STATUS_CODE_ERROR } from '../enums/account.status-code.enum';
import { AccountEntity } from '../repository/entities/account.entity';
import { AccountService } from '../services/account.service';
import { AccountProvisionService } from '../services/account-provision.service';
import { ActivityService } from '@app/modules/activity/services/activity.service';
import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';
import { ENUM_ACCOUNT_TYPE } from '../enums/account.enum';

// Reads carry the people behind the row: who linked it, who last touched it.
const AUDIT_POPULATE = ['createdBy', 'updatedBy'];

@ApiTags('modules.shared.account')
@Controller({
    version: '1',
    path: '/:workspace/account',
})
export class AccountController {
    constructor(
        private readonly accountService: AccountService,
        private readonly accountProvisionService: AccountProvisionService,
        private readonly activityService: ActivityService,
        private readonly paginationService: PaginationService
    ) {}

    @AccountListDoc()
    @ResponsePaging('account.list')
    @WorkspacePolicyAbilityProtected({
        action: [ENUM_POLICY_ACTION.READ],
        subject: ENUM_POLICY_SUBJECT.ACCOUNT,
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/')
    async list(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @PaginationQuery({
            availableSearch: ACCOUNT_SEARCHABLE_FIELDS,
        })
        { _search, _limit, _offset, _order }: PaginationListDto,
        @Query() query: AccountListQueryDto = {},
        @AccountChatbotQueryFilter() chatbotExclusion: Record<string, any> = {}
    ): Promise<IResponsePaging<AccountListResponseDto>> {
        // Unlinking an account that still had conversation history only
        // soft-deletes it, so the list has to skip deleted rows itself.
        const find: Record<string, any> = {
            workspace: workspace.id,
            deletedAt: null,
            ..._search,
            ...chatbotExclusion,
            ...accountListFilter(query),
        };
        const accounts: AccountEntity[] = await this.accountService.findAll(
            find,
            {
                paging: {
                    limit: _limit,
                    offset: _offset,
                },
                order: _order,
                populate: AUDIT_POPULATE,
            }
        );
        const total: number = await this.accountService.getTotal(find);
        const totalPage: number = this.paginationService.totalPage(
            total,
            _limit
        );
        const mapped = this.accountService.mapList(accounts);
        return {
            _pagination: { total, totalPage },
            data: mapped,
        };
    }

    @AccountListUnlinkedDoc()
    @ResponsePaging('account.list')
    @WorkspacePolicyAbilityProtected({
        action: [ENUM_POLICY_ACTION.READ],
        subject: ENUM_POLICY_SUBJECT.ACCOUNT,
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/unlinked')
    async findUnlinkedAccounts(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @PaginationQuery({
            availableSearch: ACCOUNT_SEARCHABLE_FIELDS,
        })
        { _limit, _offset, _order }: PaginationListDto
    ): Promise<IResponsePaging<AccountListResponseDto>> {
        // Accounts no chatbot in this workspace has claimed yet.
        const accounts =
            await this.accountService.findAccountsNotBelongingToAnyChatbot(
                workspace.id,
                {
                    paging: {
                        limit: _limit,
                        offset: _offset,
                    },
                    order: _order,
                }
            );

        const total = accounts.length;
        const totalPage: number = this.paginationService.totalPage(
            total,
            _limit
        );

        return {
            _pagination: { total, totalPage },
            data: this.accountService.mapList(accounts),
        };
    }

    @AccountGetDoc()
    @Response('account.get.detail')
    @WorkspacePolicyAbilityProtected({
        action: [ENUM_POLICY_ACTION.READ],
        subject: ENUM_POLICY_SUBJECT.ACCOUNT,
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/:accountId')
    async getDetail(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('accountId') accountId: string
    ): Promise<IResponse<AccountGetDetailResponseDto>> {
        // Scoped by workspace so one tenant cannot read another's account.
        const account = await this.accountService.findOneByIdOrSlug(
            accountId,
            {
                populate: AUDIT_POPULATE,
            },
            workspace.id
        );
        if (!account) {
            throw new ConflictException({
                statusCode: ENUM_ACCOUNT_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'account.error.notFound',
            });
        }

        const responseData = this.accountService.mapDetail(account);
        return {
            data: responseData,
        };
    }

    @AccountProvisionApiChannelDoc()
    @Response('account.provisionApiChannel')
    @WorkspaceScopedProtected({
        action: [ENUM_POLICY_ACTION.CREATE],
        subject: ENUM_POLICY_SUBJECT.ACCOUNT,
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/provision/api-channel')
    async provisionApiChannel(
        @Param('workspace') workspaceId: string,
        @Body() body: AccountProvisionApiChannelRequestDto,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<AccountProvisionApiChannelResponseDto>> {
        const { account, accountKey, signingSecret } =
            await this.accountProvisionService.provisionApiChannel({
                workspaceId,
                name: body.name,
                callbackUrl: body.callbackUrl,
                actionBy: user.id,
            });

        await this.activityService.createByUser(user, {
            action: ENUM_ACTIVITY_ACTION.CREATE,
            subject: ENUM_POLICY_SUBJECT.ACCOUNT,
            metadata: {
                accountId: account.id,
                type: ENUM_ACCOUNT_TYPE.API_CHANNEL,
                name: body.name,
            },
        });

        return {
            data: {
                id: account.id,
                accountKey,
                signingSecret,
                callbackUrl: body.callbackUrl,
            },
        };
    }

    @AccountRotateApiChannelSecretDoc()
    @Response('account.rotateApiChannelSecret')
    @WorkspaceScopedProtected({
        action: [ENUM_POLICY_ACTION.UPDATE],
        subject: ENUM_POLICY_SUBJECT.ACCOUNT,
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/:accountId/api-channel/rotate-secret')
    async rotateApiChannelSecret(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('accountId') accountId: string,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<AccountProvisionApiChannelResponseDto>> {
        const account = await this.findOwnedAccount(
            accountId,
            workspace.id,
            ENUM_ACCOUNT_TYPE.API_CHANNEL
        );

        const { signingSecret } =
            await this.accountProvisionService.rotateApiChannelSecret(
                account,
                user.id
            );

        await this.activityService.createByUser(user, {
            action: ENUM_ACTIVITY_ACTION.UPDATE,
            subject: ENUM_POLICY_SUBJECT.ACCOUNT,
            metadata: { accountId: account.id, rotated: 'signingSecret' },
        });

        return {
            data: {
                id: account.id,
                accountKey: account.externalId,
                signingSecret,
                callbackUrl: (account.config as { callbackUrl: string })
                    .callbackUrl,
            },
        };
    }

    @AccountProvisionWebsiteWidgetDoc()
    @Response('account.provisionWebsiteWidget')
    @WorkspaceScopedProtected({
        action: [ENUM_POLICY_ACTION.CREATE],
        subject: ENUM_POLICY_SUBJECT.ACCOUNT,
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/provision/website-widget')
    async provisionWebsiteWidget(
        @Param('workspace') workspaceId: string,
        @Body() body: AccountProvisionWebsiteWidgetRequestDto,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<AccountProvisionWebsiteWidgetResponseDto>> {
        const { account, widgetKey } =
            await this.accountProvisionService.provisionWebsiteWidget({
                workspaceId,
                name: body.name,
                allowedOrigins: body.allowedOrigins,
                theme: body.theme,
                actionBy: user.id,
            });

        await this.activityService.createByUser(user, {
            action: ENUM_ACTIVITY_ACTION.CREATE,
            subject: ENUM_POLICY_SUBJECT.ACCOUNT,
            metadata: {
                accountId: account.id,
                type: ENUM_ACCOUNT_TYPE.WEBSITE_WIDGET,
                name: body.name,
            },
        });

        return {
            data: {
                id: account.id,
                widgetKey,
                allowedOrigins: (account.config as { allowedOrigins: string[] })
                    .allowedOrigins,
            },
        };
    }

    @AccountUpdateCallbackUrlDoc()
    @Response('account.updateCallbackUrl')
    @WorkspaceScopedProtected({
        action: [ENUM_POLICY_ACTION.UPDATE],
        subject: ENUM_POLICY_SUBJECT.ACCOUNT,
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/:accountId/api-channel/callback-url')
    async updateCallbackUrl(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('accountId') accountId: string,
        @Body() body: AccountUpdateCallbackUrlRequestDto,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<AccountUpdateCallbackUrlResponseDto>> {
        const account = await this.findOwnedAccount(
            accountId,
            workspace.id,
            ENUM_ACCOUNT_TYPE.API_CHANNEL
        );

        await this.accountProvisionService.updateCallbackUrl(
            account,
            body.callbackUrl,
            user.id
        );

        await this.activityService.createByUser(user, {
            action: ENUM_ACTIVITY_ACTION.UPDATE,
            subject: ENUM_POLICY_SUBJECT.ACCOUNT,
            metadata: { accountId: account.id, updated: 'callbackUrl' },
        });

        return {
            data: {
                id: account.id,
                accountKey: account.externalId,
                callbackUrl: body.callbackUrl,
            },
        };
    }

    @AccountUpdateAllowedOriginsDoc()
    @Response('account.updateAllowedOrigins')
    @WorkspaceScopedProtected({
        action: [ENUM_POLICY_ACTION.UPDATE],
        subject: ENUM_POLICY_SUBJECT.ACCOUNT,
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/:accountId/website-widget/allowed-origins')
    async updateAllowedOrigins(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('accountId') accountId: string,
        @Body() body: AccountUpdateAllowedOriginsRequestDto,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<AccountUpdateAllowedOriginsResponseDto>> {
        const account = await this.findOwnedAccount(
            accountId,
            workspace.id,
            ENUM_ACCOUNT_TYPE.WEBSITE_WIDGET
        );

        await this.accountProvisionService.updateAllowedOrigins(
            account,
            body.allowedOrigins,
            user.id
        );

        await this.activityService.createByUser(user, {
            action: ENUM_ACTIVITY_ACTION.UPDATE,
            subject: ENUM_POLICY_SUBJECT.ACCOUNT,
            metadata: { accountId: account.id, updated: 'allowedOrigins' },
        });

        return {
            data: {
                id: account.id,
                widgetKey: account.externalId,
                allowedOrigins: (account.config as { allowedOrigins: string[] })
                    .allowedOrigins,
            },
        };
    }

    @AccountLinkDoc()
    @Response('account.link')
    @WorkspaceScopedProtected({
        action: [ENUM_POLICY_ACTION.CREATE],
        subject: ENUM_POLICY_SUBJECT.ACCOUNT,
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/link')
    async link(
        @Param('workspace') workspaceId: string,
        @Body() body: AccountLinkRequestDto,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<AccountLinkResponseDto>> {
        // The linking user both owns the new row and is its actor.
        const linkedBy = user.id;
        const account = await this.accountService.syncAccount(
            body.code,
            body.platform,
            workspaceId,
            linkedBy,
            linkedBy
        );

        const responseDto: AccountLinkResponseDto = {
            id: account.id,
            deleted: account.deleted,
            createdAt: account.createdAt,
            updatedAt: account.updatedAt,
            link: account.link,
            name: account.name,
            slug: account.slug,
            avatar: account.avatar,
            status: account.status,
            type: account.type,
            workspace: account.workspace.id,
            pages: account.pages,
            totalCookies: account.cookies?.length || 0,
            totalProxies: account.proxies?.length || 0,
        };

        return {
            data: responseDto,
        };
    }

    @AccountBatchDeleteSyncDoc()
    @Response('account.batchDeleteSync')
    @WorkspacePolicyAbilityProtected({
        action: [ENUM_POLICY_ACTION.DELETE],
        subject: ENUM_POLICY_SUBJECT.ACCOUNT,
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/batch/deleteSync')
    async batchDeleteSync(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Body() { ids }: BatchIdsRequestDto
    ): Promise<IResponse<BatchResultResponseDto>> {
        const data = await runBatch(ids, async accountId => {
            // deleteSyncAccount returns false (rather than throwing) for an
            // unknown account — turn that into a `failed` entry.
            const deleted = await this.accountService.deleteSyncAccount(
                accountId,
                workspace.id
            );

            if (!deleted) {
                throw new NotFoundException({
                    statusCode: ENUM_ACCOUNT_STATUS_CODE_ERROR.NOT_FOUND,
                    message: 'account.error.notFound',
                });
            }
        });

        return { data };
    }

    @DeleteSyncAccountDoc()
    @Response('account.deleteSync')
    @WorkspacePolicyAbilityProtected({
        action: [ENUM_POLICY_ACTION.DELETE],
        subject: ENUM_POLICY_SUBJECT.ACCOUNT,
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/deleteSync/:accountId')
    async deleteSync(
        @WorkspacePayload() workspaceId: WorkspaceEntity,
        @Param('accountId') accountId: string
    ): Promise<boolean> {
        return this.accountService.deleteSyncAccount(accountId, workspaceId.id);
    }

    /**
     * Channel-settings endpoints all start the same way: the account must
     * exist, belong to the caller's workspace, and be of the expected kind —
     * so one tenant can never repoint or rotate another tenant's channel.
     */
    private async findOwnedAccount(
        accountId: string,
        workspaceId: string,
        type: ENUM_ACCOUNT_TYPE
    ): Promise<AccountEntity> {
        const account = await this.accountService.findOne({
            id: accountId,
            workspace: workspaceId,
            type,
        });

        if (!account) {
            throw new NotFoundException({
                statusCode: ENUM_ACCOUNT_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'account.error.notFound',
            });
        }

        return account;
    }
}
