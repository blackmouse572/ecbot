import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@app/common/doc/decorators/doc.decorator';
import { applyDecorators } from '@nestjs/common';
import { WorkspaceAdminDocParamsId } from '../constants/workspace.doc.constant';
import { WorkspaceAdminResponseDto } from '../dtos/response/workspace.admin.response.dto';

export function WorkspaceAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'list every workspace with its owner, member and chatbot counts',
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ policy: true }),
        DocResponsePaging<WorkspaceAdminResponseDto>('workspace.list', {
            dto: WorkspaceAdminResponseDto,
        })
    );
}

export function WorkspaceAdminGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'get one workspace with its owner and counts' }),
        DocRequest({ params: [...WorkspaceAdminDocParamsId] }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ policy: true }),
        DocResponse('workspace.details', { dto: WorkspaceAdminResponseDto })
    );
}
