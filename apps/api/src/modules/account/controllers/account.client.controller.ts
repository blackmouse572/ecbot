import { PaginationQuery } from '@app/common/pagination/decorators/pagination.decorator';
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
    Get,
    NotFoundException,
    Param,
    Post,
    Query,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { ACCOUNT_SEARCHABLE_FIELDS } from '../constants/account.list.constant';
import {
    AccountClientApiChannelDoc,
    AccountClientConnectLinkDoc,
    AccountClientGetDoc,
    AccountClientListDoc,
    AccountClientTelegramDoc,
    AccountClientWebsiteWidgetDoc,
} from '../docs/account.client.doc';
import { AccountClientConnectLinkRequestDto } from '../dtos/request/account.client-connect-link.request.dto';
import { AccountClientTelegramRequestDto } from '../dtos/request/account.client-telegram.request.dto';
import {
    AccountListQueryDto,
    accountListFilter,
} from '../dtos/request/account.list.request.dto';
import { AccountProvisionApiChannelRequestDto } from '../dtos/request/account.provision-api-channel.request.dto';
import { AccountProvisionWebsiteWidgetRequestDto } from '../dtos/request/account.provision-website-widget.request.dto';
import { AccountClientConnectLinkResponseDto } from '../dtos/response/account.client-connect-link.response.dto';
import { AccountGetDetailResponseDto } from '../dtos/response/account.detail.response.dto';
import { AccountListResponseDto } from '../dtos/response/account.list.response.dto';
import { AccountProvisionApiChannelResponseDto } from '../dtos/response/account.provision-api-channel.response.dto';
import { AccountProvisionWebsiteWidgetResponseDto } from '../dtos/response/account.provision-website-widget.response.dto';
import { ENUM_ACCOUNT_TYPE } from '../enums/account.enum';
import { ENUM_ACCOUNT_STATUS_CODE_ERROR } from '../enums/account.status-code.enum';
import { AccountService } from '../services/account.service';
import { AccountProvisionService } from '../services/account-provision.service';

// Channels on the /client surface (ADR-0012), for the Ecbot MCP Server. Same
// abilities and services as the app's account routes; the workspace comes
// from the credential and writes act as its creator. Channels that need a
// browser sign-in on the platform get a link to the app's connect page.
@ApiTags('modules.client.account')
@Controller('/accounts')
export class AccountClientController {
    constructor(
        private readonly accountService: AccountService,
        private readonly accountProvisionService: AccountProvisionService,
        private readonly activityService: ActivityService,
        private readonly paginationService: PaginationService,
        private readonly configService: ConfigService
    ) {}

    @AccountClientListDoc()
    @ResponsePaging('account.list')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.ACCOUNT,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @Get('/')
    async list(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @PaginationQuery({ availableSearch: ACCOUNT_SEARCHABLE_FIELDS })
        { _search, _limit, _offset, _order }: PaginationListDto,
        @Query() query: AccountListQueryDto = {}
    ): Promise<IResponsePaging<AccountListResponseDto>> {
        // The credential's workspace goes last so no filter can override it.
        const find: Record<string, any> = {
            ..._search,
            ...accountListFilter(query),
            workspace: workspace.id,
            deletedAt: null,
        };
        const accounts = await this.accountService.findAll(find, {
            paging: { limit: _limit, offset: _offset },
            order: _order,
            populate: ['chatbot'],
        });
        const total = await this.accountService.getTotal(find);

        return {
            _pagination: {
                total,
                totalPage: this.paginationService.totalPage(total, _limit),
            },
            data: this.accountService.mapList(accounts),
        };
    }

    // Before /:id, so "connect-link" is not read as an account id.
    @AccountClientConnectLinkDoc()
    @Response('account.connectLink')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.ACCOUNT,
        action: [ENUM_POLICY_ACTION.CREATE],
    })
    @Get('/connect-link')
    async connectLink(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Query() { platform }: AccountClientConnectLinkRequestDto
    ): Promise<IResponse<AccountClientConnectLinkResponseDto>> {
        const appUrl = (
            this.configService.get<string>('home.url') ?? ''
        ).replace(/\/$/, '');

        return {
            data: {
                url: `${appUrl}/${workspace.slug}/accounts/create?platform=${platform}`,
            },
        };
    }

    @AccountClientGetDoc()
    @Response('account.get')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.ACCOUNT,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @Get('/:id')
    async get(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('id') id: string
    ): Promise<IResponse<AccountGetDetailResponseDto>> {
        const account = await this.accountService.findOneByIdOrSlug(
            id,
            {},
            workspace.id
        );
        if (!account) {
            throw new NotFoundException({
                statusCode: ENUM_ACCOUNT_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'account.error.notFound',
            });
        }

        return { data: this.accountService.mapDetail(account) };
    }

    @AccountClientApiChannelDoc()
    @Response('account.provisionApiChannel')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.ACCOUNT,
        action: [ENUM_POLICY_ACTION.CREATE],
    })
    @Post('/api-channel')
    async createApiChannel(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @ClientCredentialPayload() credential: ClientCredentialEntity,
        @Body() body: AccountProvisionApiChannelRequestDto
    ): Promise<IResponse<AccountProvisionApiChannelResponseDto>> {
        const { account, accountKey, signingSecret } =
            await this.accountProvisionService.provisionApiChannel({
                workspaceId: workspace.id,
                name: body.name,
                callbackUrl: body.callbackUrl,
                actionBy: credential.createdBy.id,
            });
        await this.logCreated(workspace, credential, {
            accountId: account.id,
            type: ENUM_ACCOUNT_TYPE.API_CHANNEL,
            name: body.name,
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

    @AccountClientWebsiteWidgetDoc()
    @Response('account.provisionWebsiteWidget')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.ACCOUNT,
        action: [ENUM_POLICY_ACTION.CREATE],
    })
    @Post('/website-widget')
    async createWebsiteWidget(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @ClientCredentialPayload() credential: ClientCredentialEntity,
        @Body() body: AccountProvisionWebsiteWidgetRequestDto
    ): Promise<IResponse<AccountProvisionWebsiteWidgetResponseDto>> {
        const { account, widgetKey } =
            await this.accountProvisionService.provisionWebsiteWidget({
                workspaceId: workspace.id,
                name: body.name,
                allowedOrigins: body.allowedOrigins,
                theme: body.theme,
                actionBy: credential.createdBy.id,
            });
        await this.logCreated(workspace, credential, {
            accountId: account.id,
            type: ENUM_ACCOUNT_TYPE.WEBSITE_WIDGET,
            name: body.name,
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

    @AccountClientTelegramDoc()
    @Response('account.connectTelegram')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.ACCOUNT,
        action: [ENUM_POLICY_ACTION.CREATE],
    })
    @Post('/telegram')
    async connectTelegram(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @ClientCredentialPayload() credential: ClientCredentialEntity,
        @Body() body: AccountClientTelegramRequestDto
    ): Promise<IResponse<AccountGetDetailResponseDto>> {
        // The app's link route with the token as its code, as the app sends it.
        const linkedBy = credential.createdBy.id;
        const account = await this.accountService.syncAccount(
            body.botToken.trim(),
            ENUM_ACCOUNT_TYPE.TELEGRAM_BOT,
            workspace.id,
            linkedBy,
            linkedBy
        );

        return { data: this.accountService.mapDetail(account) };
    }

    private async logCreated(
        workspace: WorkspaceEntity,
        credential: ClientCredentialEntity,
        metadata: Record<string, unknown>
    ): Promise<void> {
        await this.activityService.createByUserWithWorkspace(
            credential.createdBy,
            workspace,
            {
                action: ENUM_ACTIVITY_ACTION.CREATE,
                subject: ENUM_POLICY_SUBJECT.ACCOUNT,
                metadata,
            }
        );
    }
}
