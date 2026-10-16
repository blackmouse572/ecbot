import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
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
import { ApiKeyProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from 'src/modules/auth/decorators/auth.jwt.decorator';
import {
    PolicyAbilityProtected,
    PolicyRoleProtected,
} from 'src/modules/policy/decorators/policy.decorator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from 'src/modules/policy/enums/policy.enum';
import { UserProtected } from 'src/modules/user/decorators/user.decorator';
import {
    ToolkitAdminComposioListDoc,
    ToolkitAdminComposioStatusDoc,
    ToolkitAdminEcchoListDoc,
} from '../docs/toolkit.admin.doc';
import {
    ToolkitAdminComposioStatusResponseDto,
    ToolkitAdminEcchoResponseDto,
    ToolkitAdminResponseDto,
} from '../dtos/response/toolkit.admin.response.dto';
import { ToolkitAdminService } from '../services/toolkit.admin.service';

/** Read-only: the marketplace catalogs and how widely each toolkit is used. */
@ApiTags('modules.admin.toolkit')
@Controller({
    version: '1',
    path: '/toolkit',
})
export class ToolkitAdminController {
    constructor(
        private readonly toolkitAdminService: ToolkitAdminService,
        private readonly paginationService: PaginationService
    ) {}

    @ToolkitAdminEcchoListDoc()
    @ResponsePaging('tool.toolkit.eccho')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TOOL,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/eccho/list')
    async eccho(): Promise<IResponsePaging<ToolkitAdminEcchoResponseDto>> {
        const data = await this.toolkitAdminService.listEccho();
        return {
            _pagination: {
                total: data.length,
                totalPage: this.paginationService.totalPage(
                    data.length,
                    Math.max(data.length, 1)
                ),
            },
            data,
        };
    }

    @ToolkitAdminComposioListDoc()
    @ResponsePaging('tool.toolkit.composio')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TOOL,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/composio/list')
    async composio(
        @PaginationQuery() { _limit, _offset }: PaginationListDto,
        @Query('search') search?: string
    ): Promise<IResponsePaging<ToolkitAdminResponseDto>> {
        const { items, total } = await this.toolkitAdminService.listComposio({
            search: search?.trim() || undefined,
            limit: _limit,
            offset: _offset,
        });
        return {
            _pagination: {
                total,
                totalPage: this.paginationService.totalPage(total, _limit),
            },
            data: items,
        };
    }

    @ToolkitAdminComposioStatusDoc()
    @Response('tool.toolkit.composioStatus')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TOOL,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/composio/status')
    async composioStatus(): Promise<
        IResponse<ToolkitAdminComposioStatusResponseDto>
    > {
        return { data: await this.toolkitAdminService.composioStatus() };
    }
}
