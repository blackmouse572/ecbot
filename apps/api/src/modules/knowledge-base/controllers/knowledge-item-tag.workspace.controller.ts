import {
    Controller,
    Get,
    Post,
    Delete,
    Param,
    Body,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EntityManager } from '@mikro-orm/postgresql';

import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { KnowledgeItemTagService } from '../services/knowledge-item-tag.service';
import { KnowledgeItemEntity } from '../repository/entities/knowledge-item.entity';
import { ApiKeyProtected } from '@app/modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@app/modules/auth/decorators/auth.jwt.decorator';
import { IAuthJwtAccessTokenPayload } from '@app/modules/auth/interfaces/auth.interface';
import {
    ENUM_POLICY_SUBJECT,
    ENUM_POLICY_ACTION,
} from '@app/modules/policy/enums/policy.enum';
import { UserProtected } from '@app/modules/user/decorators/user.decorator';
import { UserActiveParsePipe } from '@app/modules/user/pipes/user.parse.pipe';
import { WorkspacePayload } from '@app/modules/workspace/decorators/workspace.decorator';
import { WorkspacePolicyAbilityProtected } from '@app/modules/workspace/decorators/workspace.policy.decorator';
import { Response } from '@app/common/response/decorators/response.decorator';
import {
    KnowledgeItemTagWorkspaceListDoc,
    KnowledgeItemTagWorkspaceDeleteDoc,
} from '../docs/knowledge-item-tag.workspace.doc';
import { ActivityService } from 'src/modules/activity/services/activity.service';
import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';

@ApiTags('modules.workspace.knowledge-base.tag')
@Controller({
    version: '1',
    path: '/:workspace/knowledge-bases/:knowledgeBaseId/tags',
})
export class KnowledgeItemTagController {
    constructor(
        private readonly em: EntityManager,
        private readonly tagService: KnowledgeItemTagService,
        private readonly activityService: ActivityService
    ) {}

    @KnowledgeItemTagWorkspaceListDoc()
    @Response('knowledge-base.tag.list')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @Param('knowledgeBaseId') knowledgeBaseId: string
    ): Promise<IResponse<string[]>> {
        const tags =
            await this.tagService.findUniqueTagsByKnowledgeBase(
                knowledgeBaseId
            );

        return {
            data: tags,
        };
    }

    @KnowledgeItemTagWorkspaceDeleteDoc()
    @Response('knowledge-base.tag.delete')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.NO_CONTENT)
    @Delete('/:tag')
    async delete(
        @AuthJwtPayload<IAuthJwtAccessTokenPayload>('user', UserActiveParsePipe)
        user: UserEntity,
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('knowledgeBaseId') knowledgeBaseId: string,
        @Param('tag') tag: string
    ): Promise<void> {
        const session = this.em.fork();
        await session.begin();

        try {
            await this.tagService.softDeleteByTag(knowledgeBaseId, tag, {
                actionBy: user.id,
                em: session,
            });

            await this.activityService.createByUser(
                user,
                {
                    action: ENUM_ACTIVITY_ACTION.DELETE,
                    subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
                    metadata: {
                        knowledgeBaseId,
                        name: tag,
                    },
                },
                { em: session }
            );

            await session.commit();
        } catch (err: unknown) {
            await session.rollback();
            throw err;
        }
    }
}
