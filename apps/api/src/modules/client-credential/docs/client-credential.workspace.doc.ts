import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@app/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from '@app/common/doc/enums/doc.enum';
import { WorkspaceDocParamsId } from '@app/modules/workspace/constants/workspace.doc.constant';
import { applyDecorators } from '@nestjs/common';
import { ClientCredentialDocParamsId } from '../constants/client-credential.doc.constant';
import { ClientCredentialCreateRequestDto } from '../dtos/request/client-credential.create.request.dto';
import { ClientCredentialCreateResponseDto } from '../dtos/response/client-credential.create.response.dto';
import { ClientCredentialGetResponseDto } from '../dtos/response/client-credential.get.response.dto';

export function ClientCredentialListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'list client credentials' }),
        DocRequest({ params: [...WorkspaceDocParamsId] }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocResponsePaging<ClientCredentialGetResponseDto>(
            'clientCredential.list',
            { dto: ClientCredentialGetResponseDto }
        )
    );
}

export function ClientCredentialCreateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'create a client credential (secret shown once)' }),
        DocRequest({
            params: [...WorkspaceDocParamsId],
            dto: ClientCredentialCreateRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocResponse('clientCredential.create', {
            dto: ClientCredentialCreateResponseDto,
        })
    );
}

export function ClientCredentialRotateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'rotate a client credential secret (shown once)',
            description:
                'Issue a new secret for an existing credential. The public key is unchanged; the previous secret stops working immediately.',
        }),
        DocRequest({
            params: [...WorkspaceDocParamsId, ...ClientCredentialDocParamsId],
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ policy: true }),
        DocResponse('clientCredential.rotate', {
            dto: ClientCredentialCreateResponseDto,
        })
    );
}

export function ClientCredentialDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'revoke a client credential',
            description:
                'Revoke (soft delete) a client credential. The credential will be marked as inactive and deleted.',
        }),
        DocRequest({
            params: [...WorkspaceDocParamsId, ...ClientCredentialDocParamsId],
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ policy: true }),
        DocResponse('clientCredential.delete')
    );
}
