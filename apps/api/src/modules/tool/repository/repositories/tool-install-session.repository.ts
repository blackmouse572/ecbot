import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { DatabaseRepository } from 'src/common/database/bases/database.repository';
import { ToolInstallSessionEntity } from 'src/modules/tool/repository/entities/tool-install-session.entity';

@Injectable()
export class ToolInstallSessionRepository extends DatabaseRepository<ToolInstallSessionEntity> {
    constructor(em: EntityManager) {
        super(em, ToolInstallSessionEntity);
    }

    async findById(id: string): Promise<ToolInstallSessionEntity | null> {
        return this.findOne({ id, deleted: false });
    }

    async findByWorkspace(
        workspaceId: string
    ): Promise<ToolInstallSessionEntity[]> {
        return this.find({
            workspace: { id: workspaceId },
            deleted: false,
            expiresAt: { $gt: new Date() },
        } as any);
    }
}
