import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { WorkspaceMemberEntity } from './entities/workspace-member.entity';
import { WorkspaceEntity } from './entities/workspace.entity';
import { WorkspaceMemberRepository } from './repositories/workspace-member.repository';
import { WorkSpaceRepository } from './repositories/workspace.repository';

// Both repositories are provided and re-exported as one unit: nothing in
// this module needs one without the other.
const WORKSPACE_REPOSITORY_PROVIDERS = [
    WorkSpaceRepository,
    WorkspaceMemberRepository,
];

@Module({
    providers: WORKSPACE_REPOSITORY_PROVIDERS,
    exports: WORKSPACE_REPOSITORY_PROVIDERS,
    imports: [
        MikroOrmModule.forFeature([WorkspaceEntity, WorkspaceMemberEntity]),
    ],
})
export class WorkspaceRepositoryModule {}
