import { IResponse } from '@app/common/response/interfaces/response.interface';
import { ApiKeyProtected } from '@app/modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from '@app/modules/auth/decorators/auth.jwt.decorator';
import { UserProtected } from '@app/modules/user/decorators/user.decorator';
import {
    WorkspaceMemberOrOwnerProtected,
    WorkspacePayload,
} from '@app/modules/workspace/decorators/workspace.decorator';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { Response } from 'src/common/response/decorators/response.decorator';
import { NavCountWorkspaceGetDoc } from '../docs/nav-count.workspace.doc';
import { NavCountGetResponseDto } from '../dtos/response/nav-count.get.response.dto';
import { NavCountService } from '../services/nav-count.service';

@ApiTags('modules.workspace.navCount')
@Controller({ version: '1', path: '/:workspace/nav-counts' })
export class NavCountWorkspaceController {
    constructor(private readonly navCountService: NavCountService) {}

    // Aggregate nav-badge counts. Guarded by workspace membership only — the
    // client hides each badge behind its nav item's own ability, so counts are
    // never shown for a section the user can't access.
    @NavCountWorkspaceGetDoc()
    @Response('navCount.workspace.get')
    @WorkspaceMemberOrOwnerProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/')
    async get(
        @WorkspacePayload() workspace: WorkspaceEntity
    ): Promise<IResponse<NavCountGetResponseDto>> {
        const counts = await this.navCountService.getWorkspaceCounts(
            workspace.id
        );
        return {
            data: plainToInstance(NavCountGetResponseDto, counts, {
                excludeExtraneousValues: true,
            }),
        };
    }
}
