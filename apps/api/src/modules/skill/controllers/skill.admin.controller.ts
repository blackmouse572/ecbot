import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from '@app/common/pagination/enums/pagination.enum';
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
import { SKILL_DEFAULT_AVAILABLE_SEARCH } from 'src/modules/skill/constants/skill.doc.constant';
import {
    SkillAdminCreateDoc,
    SkillAdminDeleteDoc,
    SkillAdminGetDoc,
    SkillAdminListDoc,
    SkillAdminUpdateDoc,
} from 'src/modules/skill/docs/skill.admin.doc';
import { CreateSkillRequestDto } from 'src/modules/skill/dtos/request/create-skill.request.dto';
import { UpdateSkillRequestDto } from 'src/modules/skill/dtos/request/update-skill.request.dto';
import { SkillGetResponseDto } from 'src/modules/skill/dtos/response/skill.get.response.dto';
import { SkillListResponseDto } from 'src/modules/skill/dtos/response/skill.list.response.dto';
import { SkillService } from 'src/modules/skill/services/skill.service';
import { UserProtected } from 'src/modules/user/decorators/user.decorator';
import { UserParsePipe } from 'src/modules/user/pipes/user.parse.pipe';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';

@ApiTags('modules.admin.skill')
@Controller({
    version: '1',
    path: '/skill',
})
export class SkillAdminController {
    constructor(
        private readonly skillService: SkillService,
        private readonly paginationService: PaginationService,
        private readonly activityService: ActivityService
    ) {}

    @SkillAdminListDoc()
    @ResponsePaging('skill.list.success')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.SKILL,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @PaginationQuery({
            availableSearch: SKILL_DEFAULT_AVAILABLE_SEARCH,
            defaultOrderBy: 'createdAt',
            defaultOrderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC,
        })
        { _search, _limit, _offset, _order }: PaginationListDto,
        @Query('source') source?: string
    ): Promise<IResponsePaging<SkillListResponseDto>> {
        const find: Record<string, any> = { ..._search };
        // 'all' = every skill in the system; default = builtin templates.
        const options = { limit: _limit, offset: _offset, order: _order };
        const [skills, total] =
            source === 'all'
                ? await Promise.all([
                      this.skillService.findAllSystem(find, options),
                      this.skillService.getTotalSystem(find),
                  ])
                : await Promise.all([
                      this.skillService.findAllBuiltin(find, options),
                      this.skillService.getTotalBuiltin(find),
                  ]);
        const totalPage = this.paginationService.totalPage(total, _limit);
        return {
            _pagination: { total, totalPage },
            data: this.skillService.mapList(skills),
        };
    }

    @SkillAdminGetDoc()
    @Response('skill.get.success')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.SKILL,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/:skillId')
    async get(
        @Param('skillId') skillId: string
    ): Promise<IResponse<SkillGetResponseDto>> {
        const { skill, instructions } =
            await this.skillService.getOneAny(skillId);
        return { data: this.skillService.mapOne(skill, instructions) };
    }

    @SkillAdminCreateDoc()
    @Response('skill.create.success')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.SKILL,
        action: [ENUM_POLICY_ACTION.CREATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/')
    async create(
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity,
        @Body() dto: CreateSkillRequestDto
    ): Promise<IResponse<DatabaseIdResponseDto>> {
        const skill = await this.skillService.createBuiltin(dto, user);
        await this.activityService.createByUser(user, {
            action: ENUM_ACTIVITY_ACTION.CREATE,
            subject: ENUM_POLICY_SUBJECT.SKILL,
            metadata: { id: skill.id, name: skill.name, isBuiltin: true },
        });
        return { data: { id: skill.id } };
    }

    @SkillAdminUpdateDoc()
    @Response('skill.update.success')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.SKILL,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/:skillId')
    async update(
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity,
        @Param('skillId') skillId: string,
        @Body() dto: UpdateSkillRequestDto
    ): Promise<IResponse<DatabaseIdResponseDto>> {
        const skill = await this.skillService.updateBuiltin(skillId, dto, user);
        await this.activityService.createByUser(user, {
            action: ENUM_ACTIVITY_ACTION.UPDATE,
            subject: ENUM_POLICY_SUBJECT.SKILL,
            metadata: { id: skill.id, name: skill.name, isBuiltin: true },
        });
        return { data: { id: skill.id } };
    }

    @SkillAdminDeleteDoc()
    @Response('skill.delete.success')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.SKILL,
        action: [ENUM_POLICY_ACTION.DELETE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/:skillId')
    async delete(
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity,
        @Param('skillId') skillId: string
    ): Promise<IResponse<DatabaseIdResponseDto>> {
        const skill = await this.skillService.softDeleteAny(skillId);
        await this.activityService.createByUser(user, {
            action: ENUM_ACTIVITY_ACTION.DELETE,
            subject: ENUM_POLICY_SUBJECT.SKILL,
            metadata: {
                id: skill.id,
                name: skill.name,
                isBuiltin: !skill.workspace,
                workspaceId: skill.workspace?.id,
            },
        });
        return { data: { id: skillId } };
    }
}
