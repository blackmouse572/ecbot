import { PaginationQuery } from '@app/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from '@app/common/pagination/dtos/pagination.list.dto';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from '@app/common/pagination/enums/pagination.enum';
import { PaginationService } from '@app/common/pagination/services/pagination.service';
import {
    Response,
    ResponsePaging,
} from '@app/common/response/decorators/response.decorator';
import {
    IResponse,
    IResponsePaging,
} from '@app/common/response/interfaces/response.interface';
import { DatabaseIdResponseDto } from 'src/common/database/dtos/response/database.id.response.dto';
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
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SKILL_DEFAULT_AVAILABLE_SEARCH } from '../constants/skill.doc.constant';
import {
    SkillClientCloneDoc,
    SkillClientCreateDoc,
    SkillClientDeleteDoc,
    SkillClientGetDoc,
    SkillClientListDoc,
    SkillClientUpdateDoc,
} from '../docs/skill.client.doc';
import { CreateSkillRequestDto } from '../dtos/request/create-skill.request.dto';
import { UpdateSkillRequestDto } from '../dtos/request/update-skill.request.dto';
import { SkillGetResponseDto } from '../dtos/response/skill.get.response.dto';
import { SkillListResponseDto } from '../dtos/response/skill.list.response.dto';
import { SkillScope } from '../repository/repositories/skill.repository';
import { SkillService } from '../services/skill.service';

// 3rd-party surface: authenticated by x-api-key (ClientCredential), tenant
// derived from the credential (no :workspace param). See ADR-0012. Writes
// act as the credential's creator, in the records and the activity log.
// The service scopes every lookup to the workspace (404 otherwise).
@ApiTags('modules.client.skill')
@Controller('/skills')
export class SkillClientController {
    constructor(
        private readonly skillService: SkillService,
        private readonly paginationService: PaginationService,
        private readonly activityService: ActivityService
    ) {}

    @SkillClientListDoc()
    @ResponsePaging('skill.list.success')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.SKILL,
        action: [ENUM_POLICY_ACTION.READ],
    })
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

        return {
            _pagination: {
                total,
                totalPage: this.paginationService.totalPage(total, _limit),
            },
            data: this.skillService.mapList(skills),
        };
    }

    @SkillClientGetDoc()
    @Response('skill.get.success')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.SKILL,
        action: [ENUM_POLICY_ACTION.READ],
    })
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

    @SkillClientCreateDoc()
    @Response('skill.create.success')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.SKILL,
        action: [ENUM_POLICY_ACTION.CREATE],
    })
    @Post('/')
    async create(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @ClientCredentialPayload() credential: ClientCredentialEntity,
        @Body() dto: CreateSkillRequestDto
    ): Promise<IResponse<DatabaseIdResponseDto>> {
        const skill = await this.skillService.create(
            workspace.id,
            dto,
            credential.createdBy
        );
        await this.log(ENUM_ACTIVITY_ACTION.CREATE, workspace, credential, {
            id: skill.id,
            name: skill.name,
        });

        return { data: { id: skill.id } };
    }

    @SkillClientCloneDoc()
    @Response('skill.clone.success')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.SKILL,
        action: [ENUM_POLICY_ACTION.CREATE],
    })
    @Post('/:skillId/duplicate')
    async clone(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @ClientCredentialPayload() credential: ClientCredentialEntity,
        @Param('skillId') skillId: string
    ): Promise<IResponse<DatabaseIdResponseDto>> {
        const skill = await this.skillService.cloneFromTemplate(
            workspace.id,
            skillId,
            credential.createdBy
        );
        await this.log(ENUM_ACTIVITY_ACTION.CREATE, workspace, credential, {
            id: skill.id,
            name: skill.name,
            clonedFrom: skillId,
        });

        return { data: { id: skill.id } };
    }

    @SkillClientUpdateDoc()
    @Response('skill.update.success')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.SKILL,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @Patch('/:skillId')
    async update(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @ClientCredentialPayload() credential: ClientCredentialEntity,
        @Param('skillId') skillId: string,
        @Body() dto: UpdateSkillRequestDto
    ): Promise<IResponse<DatabaseIdResponseDto>> {
        const skill = await this.skillService.update(
            workspace.id,
            skillId,
            dto,
            credential.createdBy
        );
        await this.log(ENUM_ACTIVITY_ACTION.UPDATE, workspace, credential, {
            id: skill.id,
            name: skill.name,
        });

        return { data: { id: skill.id } };
    }

    @SkillClientDeleteDoc()
    @Response('skill.delete.success')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.SKILL,
        action: [ENUM_POLICY_ACTION.DELETE],
    })
    @Delete('/:skillId')
    async delete(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @ClientCredentialPayload() credential: ClientCredentialEntity,
        @Param('skillId') skillId: string
    ): Promise<IResponse<DatabaseIdResponseDto>> {
        const skill = await this.skillService.softDelete(workspace.id, skillId);
        await this.log(ENUM_ACTIVITY_ACTION.DELETE, workspace, credential, {
            id: skillId,
            name: skill.name,
        });

        return { data: { id: skillId } };
    }

    private async log(
        action: ENUM_ACTIVITY_ACTION,
        workspace: WorkspaceEntity,
        credential: ClientCredentialEntity,
        metadata: Record<string, string>
    ): Promise<void> {
        await this.activityService.createByUserWithWorkspace(
            credential.createdBy,
            workspace,
            { action, subject: ENUM_POLICY_SUBJECT.SKILL, metadata }
        );
    }
}
