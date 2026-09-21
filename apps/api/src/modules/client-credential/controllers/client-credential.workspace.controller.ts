import {
    PaginationQuery,
    PaginationQueryFilterInBoolean,
} from '@app/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from '@app/common/pagination/dtos/pagination.list.dto';
import { PaginationService } from '@app/common/pagination/services/pagination.service';
import {
    Response,
    ResponsePaging,
} from '@app/common/response/decorators/response.decorator';
import {
    IResponse,
    IResponsePaging,
} from '@app/common/response/interfaces/response.interface';
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
import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    NotFoundException,
    Param,
    Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CLIENT_CREDENTIAL_SEARCHABLE_FIELDS } from '../constants/client-credential.doc.constant';
import {
    ClientCredentialCreateDoc,
    ClientCredentialDeleteDoc,
    ClientCredentialListDoc,
    ClientCredentialRotateDoc,
} from '../docs/client-credential.workspace.doc';
import { ClientCredentialCreateRequestDto } from '../dtos/request/client-credential.create.request.dto';
import { ClientCredentialCreateResponseDto } from '../dtos/response/client-credential.create.response.dto';
import { ClientCredentialGetResponseDto } from '../dtos/response/client-credential.get.response.dto';
import { ClientCredentialService } from '../services/client-credential.service';

@ApiTags('modules.workspace.clientCredential')
@Controller({
    version: '1',
    path: '/:workspace/client-credential',
})
export class ClientCredentialWorkspaceController {
    constructor(
        private readonly clientCredentialService: ClientCredentialService,
        private readonly paginationService: PaginationService
    ) {}

    @ClientCredentialListDoc()
    @ResponsePaging('clientCredential.list')
    @WorkspaceScopedProtected({
        action: [ENUM_POLICY_ACTION.READ],
        subject: ENUM_POLICY_SUBJECT.CLIENT_CREDENTIAL,
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get()
    async list(
        @PaginationQuery({
            availableSearch: CLIENT_CREDENTIAL_SEARCHABLE_FIELDS,
        })
        { _search, _limit, _offset, _order }: PaginationListDto,
        @WorkspacePayload() workspace: WorkspaceEntity,
        @PaginationQueryFilterInBoolean('isActive', [true, false])
        _isActive?: Record<string, any>
    ): Promise<IResponsePaging<ClientCredentialGetResponseDto>> {
        const find: Record<string, any> = {
            ..._search,
            ...(_isActive ? _isActive : {}),
            workspace: workspace.id,
        };
        const credentials = await this.clientCredentialService.findAll(find, {
            paging: { limit: _limit, offset: _offset },
            order: _order,
        });
        const total = await this.clientCredentialService.getTotal(find);
        const totalPage = this.paginationService.totalPage(total, _limit);
        return {
            _pagination: { total, totalPage },
            data: this.clientCredentialService.mapList(credentials),
        };
    }

    @ClientCredentialCreateDoc()
    @Response('clientCredential.create')
    @WorkspaceScopedProtected({
        action: [ENUM_POLICY_ACTION.CREATE],
        subject: ENUM_POLICY_SUBJECT.CLIENT_CREDENTIAL,
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post()
    async create(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Body() dto: ClientCredentialCreateRequestDto,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<ClientCredentialCreateResponseDto>> {
        const created = await this.clientCredentialService.create(
            workspace,
            dto,
            user.id
        );
        return { data: created };
    }

    @ClientCredentialRotateDoc()
    @Response('clientCredential.rotate')
    @WorkspaceScopedProtected({
        action: [ENUM_POLICY_ACTION.UPDATE],
        subject: ENUM_POLICY_SUBJECT.CLIENT_CREDENTIAL,
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/:id/rotate')
    async rotate(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('id') id: string,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<ClientCredentialCreateResponseDto>> {
        const credential = await this.findOwned(workspace, id);
        const rotated = await this.clientCredentialService.rotate(
            credential,
            user.id
        );
        return { data: rotated };
    }

    @ClientCredentialDeleteDoc()
    @Response('clientCredential.delete')
    @WorkspaceScopedProtected({
        action: [ENUM_POLICY_ACTION.DELETE],
        subject: ENUM_POLICY_SUBJECT.CLIENT_CREDENTIAL,
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.NO_CONTENT)
    @Delete('/:id')
    async delete(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('id') id: string,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<void> {
        const credential = await this.findOwned(workspace, id);
        await this.clientCredentialService.delete(credential, user.id);
    }

    // Scoping the lookup by workspace is what stops one tenant rotating or
    // revoking another's credential by id.
    private async findOwned(workspace: WorkspaceEntity, id: string) {
        const credential = await this.clientCredentialService.findOne({
            id,
            workspace: workspace.id,
        });
        if (!credential) {
            throw new NotFoundException({
                statusCode: 404,
                message: 'clientCredential.error.notFound',
            });
        }
        return credential;
    }
}
