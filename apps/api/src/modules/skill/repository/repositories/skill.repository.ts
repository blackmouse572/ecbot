import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { IPaginationOrder } from 'src/common/pagination/interfaces/pagination.interface';
import { SkillEntity } from 'src/modules/skill/repository/entities/skill.entity';

export type SkillScope = 'workspace' | 'template' | 'all' | 'system';

@Injectable()
export class SkillRepository extends DatabaseRepository<SkillEntity> {
    constructor(em: EntityManager) {
        super(em, SkillEntity);
    }

    // Scope: 'workspace' = owned only, 'template' = builtin (workspace null),
    // 'all' = both readable in a workspace, 'system' = every skill (admin).
    private scopedWhere(
        workspaceId: string,
        scope: SkillScope
    ): Record<string, any> {
        if (scope === 'system') return { deleted: false };
        if (scope === 'template') return { workspace: null, deleted: false };
        if (scope === 'all') {
            return {
                $or: [{ workspace: { id: workspaceId } }, { workspace: null }],
                deleted: false,
            };
        }
        return { workspace: { id: workspaceId }, deleted: false };
    }

    async findAllScoped(
        workspaceId: string,
        find: Record<string, any>,
        scope: SkillScope,
        options: {
            limit?: number;
            offset?: number;
            order?: IPaginationOrder;
            populate?: string[];
        } = {}
    ): Promise<SkillEntity[]> {
        return this.find(
            { ...find, ...this.scopedWhere(workspaceId, scope) },
            {
                limit: options.limit,
                offset: options.offset,
                orderBy: (options.order as any) ?? { createdAt: 'DESC' },
                populate: options.populate as any,
            }
        );
    }

    async countScoped(
        workspaceId: string,
        find: Record<string, any>,
        scope: SkillScope
    ): Promise<number> {
        return this.getTotal({
            ...find,
            ...this.scopedWhere(workspaceId, scope),
        });
    }

    async findOneReadable(
        skillId: string,
        workspaceId: string
    ): Promise<SkillEntity | null> {
        return this.findOne({
            id: skillId,
            ...this.scopedWhere(workspaceId, 'all'),
        });
    }

    // Any skill regardless of workspace — admin system-wide read/moderation.
    async findOneAnyById(skillId: string): Promise<SkillEntity | null> {
        return this.findOne(
            { id: skillId, deleted: false },
            { populate: ['workspace'] as any }
        );
    }

    // A builtin template (workspace = null) — the clone source.
    async findOneTemplate(skillId: string): Promise<SkillEntity | null> {
        return this.findOne({ id: skillId, workspace: null, deleted: false });
    }

    async findOneBuiltinBySlug(slug: string): Promise<SkillEntity | null> {
        // Includes soft-deleted rows — the unique constraint spans them.
        return this.findOne({ slug, workspace: null });
    }

    // Owned = editable/deletable (excludes builtin skills).
    async findOneOwned(
        skillId: string,
        workspaceId: string
    ): Promise<SkillEntity | null> {
        return this.findOne({
            id: skillId,
            workspace: { id: workspaceId },
            deleted: false,
        });
    }

    // Slug uniqueness check for minting — includes soft-deleted rows, since the
    // (workspace_id, slug) unique constraint spans them too.
    async findOneBySlugInWorkspace(
        slug: string,
        workspaceId: string
    ): Promise<SkillEntity | null> {
        return this.findOne({ slug, workspace: { id: workspaceId } });
    }
}
