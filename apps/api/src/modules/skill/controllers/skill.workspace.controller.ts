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
import { BatchIdsRequestDto } from 'src/common/batch/dtos/batch.request.dto';
import { BatchResultResponseDto } from 'src/common/batch/dtos/batch.response.dto';
import { runBatch } from 'src/common/batch/utils/run-batch.util';
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
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from 'src/modules/policy/enums/policy.enum';
import { SKILL_DEFAULT_AVAILABLE_SEARCH } from 'src/modules/skill/constants/skill.doc.constant';
import {
    SkillWorkspaceBatchDeleteDoc,
    SkillWorkspaceCloneDoc,
    SkillWorkspaceCreateDoc,
    SkillWorkspaceDeleteDoc,
    SkillWorkspaceGetDoc,
    SkillWorkspaceListDoc,
    SkillWorkspaceUpdateDoc,
} from 'src/modules/skill/docs/skill.workspace.doc';
import { SkillScope } from 'src/modules/skill/repository/repositories/skill.repository';
import { CreateSkillRequestDto } from 'src/modules/skill/dtos/request/create-skill.request.dto';
import { UpdateSkillRequestDto } from 'src/modules/skill/dtos/request/update-skill.request.dto';
import { SkillGetResponseDto } from 'src/modules/skill/dtos/response/skill.get.response.dto';
import { SkillListResponseDto } from 'src/modules/skill/dtos/response/skill.list.response.dto';
import { SkillService } from 'src/modules/skill/services/skill.service';
import { UserParsePipe } from 'src/modules/user/pipes/user.parse.pipe';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { UserProtected } from 'src/modules/user/decorators/user.decorator';
import {
    WorkspacePayload,
    WorkspacePolicyAbilityProtected,
} from 'src/modules/workspace/decorators/workspace.decorator';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';

@ApiTags('modules.workspace.skill')
@Controller({
    version: '1',
    path: '/:workspace/skill',
})
export class SkillWorkspaceController {
    constructor(
        private readonly skillService: SkillService,
        private readonly paginationService: PaginationService,
        private readonly activityService: ActivityService
    ) {}

    @SkillWorkspaceListDoc()
    @ResponsePaging('skill.list.success')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.SKILL,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/')
    async list(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @PaginationQuery({
            availableSearch: SKILL_DEFAULT_AVAILABLE_SEARCH,
            defaultOrderBy: 'createdAt',
            defaultOrderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC,
        })
        { _search, _limit, _offset, _order }: PaginationListDto,
        @Query('source') source?: string
    ): Promise<IResponsePaging<SkillListResponseDto>> {
        const scope: SkillScope =
            source === 'template' || source === 'all' ? source : 'workspace';
        const find: Record<string, any> = { ..._search };
        const [skills, total] = await Promise.all([
            this.skillService.findAllByWorkspace(workspace.id, find, scope, {
                limit: _limit,
                offset: _offset,
                order: _order,
            }),
            this.skillService.getTotalByWorkspace(workspace.id, find, scope),
        ]);
        const totalPage: number = this.paginationService.totalPage(
            total,
            _limit
        );
        return {
            _pagination: { total, totalPage },
            data: this.skillService.mapList(skills),
        };
    }

    @SkillWorkspaceGetDoc()
    @Response('skill.get.success')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.SKILL,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/:skillId')
    async get(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('skillId') skillId: string
    ): Promise<IResponse<SkillGetResponseDto>> {
        const { skill, instructions } = await this.skillService.getOne(
            workspace.id,
            skillId
        );
        return { data: this.skillService.mapOne(skill, instructions) };
    }

    @SkillWorkspaceCreateDoc()
    @Response('skill.create.success')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.SKILL,
        action: [ENUM_POLICY_ACTION.CREATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/')
    async create(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity,
        @Body() dto: CreateSkillRequestDto
    ): Promise<IResponse<DatabaseIdResponseDto>> {
        const skill = await this.skillService.create(workspace.id, dto, user);
        await this.activityService.createByUserWithWorkspace(user, workspace, {
            action: ENUM_ACTIVITY_ACTION.CREATE,
            subject: ENUM_POLICY_SUBJECT.SKILL,
            metadata: { id: skill.id, name: skill.name },
        });
        return { data: { id: skill.id } };
    }

    @SkillWorkspaceCloneDoc()
    @Response('skill.clone.success')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.SKILL,
        action: [ENUM_POLICY_ACTION.CREATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/:skillId/duplicate')
    async clone(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity,
        @Param('skillId') skillId: string
    ): Promise<IResponse<DatabaseIdResponseDto>> {
        const skill = await this.skillService.cloneFromTemplate(
            workspace.id,
            skillId,
            user
        );
        await this.activityService.createByUserWithWorkspace(user, workspace, {
            action: ENUM_ACTIVITY_ACTION.CREATE,
            subject: ENUM_POLICY_SUBJECT.SKILL,
            metadata: { id: skill.id, name: skill.name, clonedFrom: skillId },
        });
        return { data: { id: skill.id } };
    }

    @SkillWorkspaceUpdateDoc()
    @Response('skill.update.success')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.SKILL,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/:skillId')
    async update(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity,
        @Param('skillId') skillId: string,
        @Body() dto: UpdateSkillRequestDto
    ): Promise<IResponse<DatabaseIdResponseDto>> {
        const skill = await this.skillService.update(
            workspace.id,
            skillId,
            dto,
            user
        );
        await this.activityService.createByUserWithWorkspace(user, workspace, {
            action: ENUM_ACTIVITY_ACTION.UPDATE,
            subject: ENUM_POLICY_SUBJECT.SKILL,
            metadata: { id: skill.id, name: skill.name },
        });
        return { data: { id: skill.id } };
    }

    @SkillWorkspaceBatchDeleteDoc()
    @Response('skill.batchDelete.success')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.SKILL,
        action: [ENUM_POLICY_ACTION.DELETE],
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
        const data = await runBatch(ids, async skillId => {
            await this.skillService.softDelete(workspace.id, skillId);
            await this.activityService.createByUserWithWorkspace(
                user,
                workspace,
                {
                    action: ENUM_ACTIVITY_ACTION.DELETE,
                    subject: ENUM_POLICY_SUBJECT.SKILL,
                    metadata: { id: skillId },
                }
            );
        });

        return { data };
    }

    @SkillWorkspaceDeleteDoc()
    @Response('skill.delete.success')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.SKILL,
        action: [ENUM_POLICY_ACTION.DELETE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/:skillId')
    async delete(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity,
        @Param('skillId') skillId: string
    ): Promise<IResponse<DatabaseIdResponseDto>> {
        const skill = await this.skillService.softDelete(workspace.id, skillId);
        await this.activityService.createByUserWithWorkspace(user, workspace, {
            action: ENUM_ACTIVITY_ACTION.DELETE,
            subject: ENUM_POLICY_SUBJECT.SKILL,
            metadata: { id: skillId, name: skill.name },
        });
        return { data: { id: skillId } };
    }
}
