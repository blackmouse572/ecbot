import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
} from '@app/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from '@app/common/doc/enums/doc.enum';
import { WorkspaceDocParamsId } from '@app/modules/workspace/constants/workspace.doc.constant';
import { applyDecorators } from '@nestjs/common';
import { AgentBuilderSuggestRequestDto } from '../dtos/request/agent-builder.suggest.request.dto';
import { AgentBuilderSuggestResponseDto } from '../dtos/response/agent-builder.suggest.response.dto';

export function AgentBuilderWorkspaceSuggestDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'suggest agent builder answers from a short description' }),
        DocRequest({
            params: WorkspaceDocParamsId,
            dto: AgentBuilderSuggestRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ policy: true }),
        DocResponse('agentBuilder.suggest.success', { dto: AgentBuilderSuggestResponseDto })
    );
}
