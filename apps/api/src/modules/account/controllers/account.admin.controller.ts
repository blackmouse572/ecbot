import {
    Body,
    Controller,
    Get,
    NotFoundException,
    Param,
    Patch,
    Post,
    Put,
    Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ENUM_APP_STATUS_CODE_ERROR } from 'src/app/enums/app.status-code.enum';
import { DatabaseIdResponseDto } from 'src/common/database/dtos/response/database.id.response.dto';
import { PaginationQuery } from 'src/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from 'src/common/pagination/dtos/pagination.list.dto';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import {
    Response,
    ResponsePaging,
} from 'src/common/response/decorators/response.decorator';
import {
    IResponse,
    IResponsePaging,
} from 'src/common/response/interfaces/response.interface';
import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';
import { ActivityService } from '@app/modules/activity/services/activity.service';
import { hasToObject } from '@app/common/utils/common';
import { UserParsePipe } from '@app/modules/user/pipes/user.parse.pipe';
import { UserEntity } from '@app/modules/user/repository/entities/user.entity';
import { plainToInstance } from 'class-transformer';
import { UserProtected } from 'src/modules/user/decorators/user.decorator';
import { ApiKeyProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from 'src/modules/auth/decorators/auth.jwt.decorator';
import {
    PolicyAbilityProtected,
    PolicyRoleProtected,
} from 'src/modules/policy/decorators/policy.decorator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from 'src/modules/policy/enums/policy.enum';
import { ACCOUNT_SEARCHABLE_FIELDS } from '../constants/account.list.constant';
import {
    AccountAdminCreateDoc,
    AccountAdminGetDoc,
    AccountAdminListDoc,
    AccountAdminUpdateDoc,
    AccountAdminUpdateStatusDoc,
} from '../docs/account.admin.doc';
import { AccountCreateRequestDto } from '../dtos/request/account.create.request.dto';
import {
    AccountAdminListQueryDto,
    accountListFilter,
} from '../dtos/request/account.list.request.dto';
import { AccountUpdateStatusRequestDto } from '../dtos/request/account.update-status.request.dto';
import { AccountUpdateRequestDto } from '../dtos/request/account.update.request.dto';
import { AccountGetDetailResponseDto } from '../dtos/response/account.detail.response.dto';
import { AccountListResponseDto } from '../dtos/response/account.list.response.dto';
import { AccountEntity } from '../repository/entities/account.entity';
import { AccountService } from '../services/account.service';

@ApiTags('modules.admin.account')
@Controller({
    version: '1',
    path: '/account',
})
export class AccountAdminController {
    constructor(
        private readonly paginationService: PaginationService,
        private readonly accountService: AccountService,
        private readonly activityService: ActivityService
    ) {}

    @AccountAdminListDoc()
    @ResponsePaging('account.list')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.USER,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @PaginationQuery({
            availableSearch: ACCOUNT_SEARCHABLE_FIELDS,
        })
        { _search, _limit, _offset, _order }: PaginationListDto,
        @Query() query: AccountAdminListQueryDto = {}
    ): Promise<IResponsePaging<AccountListResponseDto>> {
        // Admin reads are cross-tenant: the workspace is one more filter
        // rather than a boundary taken from the route.
        const { workspace } = query;
        const find: Record<string, any> = {
            ..._search,
            ...accountListFilter(query),
            ...(workspace && { workspace }),
        };
        const accounts: AccountEntity[] = await this.accountService.findAll(
            find,
            {
                paging: {
                    limit: _limit,
                    offset: _offset,
                },
                order: _order,
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

    @AccountAdminGetDoc()
    @Response('account.get')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.USER,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/get/:accountId')
    async get(
        @Param('accountId') accountId: string
    ): Promise<IResponse<AccountGetDetailResponseDto>> {
        const account = await this.accountService.findOneByIdOrSlug(accountId);
        if (!account) {
            throw new NotFoundException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'account.get.notFound',
            });
        }

        // `toObject()` drops the hidden columns (accessToken, config); a row
        // that is already plain has nothing to drop.
        const plain = hasToObject(account) ? account.toObject() : account;

        return {
            data: plainToInstance(AccountGetDetailResponseDto, { ...plain }),
        };
    }

    @AccountAdminCreateDoc()
    @Response('account.create')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.USER,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.CREATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/create')
    async create(
        @Body() body: AccountCreateRequestDto,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<DatabaseIdResponseDto>> {
        // TODO: Validate workspaceId exists and user has permission to create account in this workspace
        const account = await this.accountService.create({
            ...body,
            addedBy: user.id,
        });

        await this.recordActivity(user, ENUM_ACTIVITY_ACTION.CREATE, account);

        return {
            data: {
                id: account.id,
            },
        };
    }

    @AccountAdminUpdateDoc()
    @Response('account.update')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.USER,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/update/:accountId')
    async update(
        @Param('accountId') accountId: string,
        @Body() body: AccountUpdateRequestDto,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<void> {
        const account = await this.accountService.findOneByIdOrSlug(accountId);
        await this.accountService.update(account, body);

        await this.recordActivity(user, ENUM_ACTIVITY_ACTION.UPDATE, account);
    }

    @AccountAdminUpdateStatusDoc()
    @Response('account.updateStatus')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.USER,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/update/:accountId/status')
    async updateStatus(
        @Param('accountId') accountId: string,
        @Body() { status }: AccountUpdateStatusRequestDto,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<void>> {
        const account = await this.accountService.findOneByIdOrSlug(accountId);
        await this.accountService.updateStatus(account, { status });

        await this.recordActivity(user, ENUM_ACTIVITY_ACTION.UPDATE, account);

        // The message reads "… is now active/blocked".
        return {
            _metadata: {
                customProperty: {
                    messageProperties: {
                        status: status.toLowerCase(),
                    },
                },
            },
        };
    }

    private async recordActivity(
        user: UserEntity,
        action: ENUM_ACTIVITY_ACTION,
        account: AccountEntity
    ): Promise<void> {
        await this.activityService.createByUser(user, {
            action,
            subject: ENUM_POLICY_SUBJECT.ACCOUNT,
            metadata: {
                id: account.id,
                name: account.name,
            },
        });
    }
}
