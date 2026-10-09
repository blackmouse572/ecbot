import { IResponse } from '@app/common/response/interfaces/response.interface';
import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';
import { ActivityService } from '@app/modules/activity/services/activity.service';
import { ApiKeyProtected } from '@app/modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@app/modules/auth/decorators/auth.jwt.decorator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '@app/modules/policy/enums/policy.enum';
import { UserProtected } from '@app/modules/user/decorators/user.decorator';
import { UserParsePipe } from '@app/modules/user/pipes/user.parse.pipe';
import { UserEntity } from '@app/modules/user/repository/entities/user.entity';
import {
    WorkspacePayload,
    WorkspaceScopedProtected,
} from '@app/modules/workspace/decorators/workspace.decorator';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import { Controller, Get, Header, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'src/common/response/decorators/response.decorator';
import { ExportWorkspaceCustomerDoc } from '../docs/export.doc';
import { CustomerDataExportResponseDto } from '../dtos/response/customer-data-export.response.dto';
import { CustomerDataExportService } from '../services/customer-data-export.service';

@ApiTags('modules.workspace.customer')
@Controller({
    version: '1',
    path: '/:workspace/customers',
})
export class ExportWorkspaceController {
    constructor(
        private readonly customerDataExportService: CustomerDataExportService,
        private readonly activityService: ActivityService
    ) {}

    @ExportWorkspaceCustomerDoc()
    @Response('export.customer')
    // CUSTOMER_DATA, not CUSTOMER: the export holds everything stored about
    // the person, so it is for the workspace owner and admins, not Members.
    @WorkspaceScopedProtected({
        subject: ENUM_POLICY_SUBJECT.CUSTOMER_DATA,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Throttle({ default: { ttl: 60000, limit: 5 } })
    @Header('Content-Disposition', 'attachment; filename="customer-data.json"')
    @Get('/:id/export')
    async customer(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('id') id: string,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<CustomerDataExportResponseDto>> {
        const data = await this.customerDataExportService.export(
            id,
            workspace.id
        );
        await this.activityService.createByUserWithWorkspace(user, workspace, {
            action: ENUM_ACTIVITY_ACTION.EXPORT,
            subject: ENUM_POLICY_SUBJECT.CUSTOMER,
            metadata: { id },
        });
        return { data };
    }
}
