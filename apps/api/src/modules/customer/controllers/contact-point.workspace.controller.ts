import { IResponsePaging } from '@app/common/response/interfaces/response.interface';
import { ApiKeyProtected } from '@app/modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from '@app/modules/auth/decorators/auth.jwt.decorator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '@app/modules/policy/enums/policy.enum';
import { UserProtected } from '@app/modules/user/decorators/user.decorator';
import {
    WorkspacePayload,
    WorkspaceScopedProtected,
} from '@app/modules/workspace/decorators/workspace.decorator';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ResponsePaging } from 'src/common/response/decorators/response.decorator';
import { ContactPointWorkspaceListByCustomerDoc } from '../docs/customer.workspace.doc';
import { ContactPointGetResponseDto } from '../dtos/response/contact-point.get.response.dto';
import { ContactPointService } from '../services/contact-point.service';

@ApiTags('modules.workspace.contactPoint')
@Controller({
    version: '1',
    path: '/:workspace/contact-points',
})
export class ContactPointWorkspaceController {
    constructor(private readonly contactPointService: ContactPointService) {}

    @ContactPointWorkspaceListByCustomerDoc()
    @ResponsePaging('contactPoint.workspace.listByCustomer')
    @WorkspaceScopedProtected({
        subject: ENUM_POLICY_SUBJECT.CONTACT_POINT,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/')
    async listByCustomer(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Query('customer') customerId: string
    ): Promise<IResponsePaging<ContactPointGetResponseDto>> {
        // BOLA guard — filter by both customer AND workspace so contact points
        // from a different workspace can never leak even if an operator
        // crafts the URL with a foreign customer id.
        const contactPoints = customerId
            ? await this.contactPointService.findByCustomerInWorkspace(
                  customerId,
                  workspace.id
              )
            : [];

        return {
            _pagination: { total: contactPoints.length, totalPage: 1 },
            data: this.contactPointService.mapList(contactPoints),
        };
    }
}
