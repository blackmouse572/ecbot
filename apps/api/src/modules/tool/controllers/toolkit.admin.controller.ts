import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
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
import { ENUM_ACTIVITY_ACTION } from 'src/modules/activity/enums/activity.enum';
import { ActivityService } from 'src/modules/activity/services/activity.service';
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
import { UserProtected } from 'src/modules/user/decorators/user.decorator';
import { UserParsePipe } from 'src/modules/user/pipes/user.parse.pipe';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import {
    ToolkitAdminComposioListDoc,
    ToolkitAdminComposioStatusDoc,
    ToolkitAdminEcchoCreateDoc,
    ToolkitAdminEcchoGetDoc,
    ToolkitAdminEcchoListDoc,
    ToolkitAdminEcchoUpdateDoc,
} from '../docs/toolkit.admin.doc';
import {
    ToolkitAdminComposioStatusResponseDto,
    ToolkitAdminEcchoDetailResponseDto,
    ToolkitAdminEcchoResponseDto,
    ToolkitAdminResponseDto,
} from '../dtos/response/toolkit.admin.response.dto';
import { CreateToolkitRequestDto } from '../dtos/request/create-toolkit.request.dto';
import { UpdateToolkitRequestDto } from '../dtos/request/update-toolkit.request.dto';
import { ToolkitAdminService } from '../services/toolkit.admin.service';

/**
 * The marketplace catalogs and how widely each toolkit is used. Only Ecbot's
 * own toolkits can be edited; Composio's catalog is read-only.
 */
@ApiTags('modules.admin.toolkit')
@Controller({
    version: '1',
    path: '/toolkit',
})
export class ToolkitAdminController {
    constructor(
        private readonly toolkitAdminService: ToolkitAdminService,
        private readonly paginationService: PaginationService,
        private readonly activityService: ActivityService
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

    @ToolkitAdminEcchoGetDoc()
    @Response('tool.toolkit.ecchoGet')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TOOL,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/eccho/:slug')
    async ecchoGet(
        @Param('slug') slug: string
    ): Promise<IResponse<ToolkitAdminEcchoDetailResponseDto>> {
        return { data: await this.toolkitAdminService.getEccho(slug) };
    }

    @ToolkitAdminEcchoCreateDoc()
    @Response('tool.toolkit.ecchoCreate')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TOOL,
        action: [ENUM_POLICY_ACTION.CREATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/eccho')
    async ecchoCreate(
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity,
        @Body() dto: CreateToolkitRequestDto
    ): Promise<IResponse<ToolkitAdminEcchoDetailResponseDto>> {
        const data = await this.toolkitAdminService.createEccho(dto, user);
        await this.activityService.createByUser(user, {
            action: ENUM_ACTIVITY_ACTION.CREATE,
            subject: ENUM_POLICY_SUBJECT.TOOL,
            metadata: { toolkit: dto.slug },
        });
        return { data };
    }

    @ToolkitAdminEcchoUpdateDoc()
    @Response('tool.toolkit.ecchoUpdate')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TOOL,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/eccho/:slug')
    async ecchoUpdate(
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity,
        @Param('slug') slug: string,
        @Body() dto: UpdateToolkitRequestDto
    ): Promise<IResponse<ToolkitAdminEcchoDetailResponseDto>> {
        const data = await this.toolkitAdminService.updateEccho(
            slug,
            dto,
            user
        );
        await this.activityService.createByUser(user, {
            action: ENUM_ACTIVITY_ACTION.UPDATE,
            subject: ENUM_POLICY_SUBJECT.TOOL,
            metadata: { toolkit: slug, fields: Object.keys(dto) },
        });
        return { data };
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
