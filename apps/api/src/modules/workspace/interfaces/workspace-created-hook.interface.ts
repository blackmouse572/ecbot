import { UserEntity } from '@app/modules/user/repository/entities/user.entity';
import { EntityManager } from '@mikro-orm/postgresql';
import { WorkspaceEntity } from '../repository/entities/workspace.entity';

export const WORKSPACE_CREATED_HOOK = Symbol('WORKSPACE_CREATED_HOOK');

/**
 * Two phases, both absent in the public build; Ecbot Cloud provides them to
 * put the workspace on the default plan and to warn the owner when it could
 * not. Stateless between the two — the second phase re-derives what it needs.
 */
export interface WorkspaceCreatedHook {
    /**
     * Inside the creation transaction, after the owner role and membership
     * exist. Everything written here must go through `ctx.em`, so a
     * rolled-back workspace leaves nothing behind.
     */
    onWorkspaceCreated(
        workspace: WorkspaceEntity,
        owner: UserEntity,
        ctx: { em: EntityManager }
    ): Promise<void>;

    /** After the commit. Never fatal: the caller logs and continues. */
    afterWorkspaceCreated(
        workspace: WorkspaceEntity,
        owner: UserEntity
    ): Promise<void>;
}
