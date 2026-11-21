import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@app/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from '@app/common/doc/enums/doc.enum';
import { WorkspaceDocParamsId } from '@app/modules/workspace/constants/workspace.doc.constant';
import { applyDecorators, HttpStatus } from '@nestjs/common';
import { MarketingAudienceDocParamsId } from '../constants/marketing-audience.doc.constant';
import { MarketingSavedAudienceCreateRequestDto } from '../dtos/request/marketing-saved-audience.create.request.dto';
import { MarketingSavedAudienceUpdateRequestDto } from '../dtos/request/marketing-saved-audience.update.request.dto';
import { MarketingSavedAudienceGetResponseDto } from '../dtos/response/marketing-saved-audience.get.response.dto';

/**
 * Saved audience docs for both surfaces: the workspace routes take
 * `:workspace` and a signed-in member, the client routes an API key only.
 */
type Surface = 'workspace' | 'client';

const auth = (surface: Surface) =>
    surface === 'client'
        ? DocAuth({ xApiKey: true })
        : DocAuth({ xApiKey: true, jwtAccessToken: true });

const params = (surface: Surface, withId = false) => [
    ...(surface === 'workspace' ? WorkspaceDocParamsId : []),
    ...(withId ? MarketingAudienceDocParamsId : []),
];

const dto = MarketingSavedAudienceGetResponseDto;

export function MarketingSavedAudienceListDoc(
    surface: Surface
): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'List saved audiences' }),
        DocRequest({ params: params(surface) }),
        auth(surface),
        DocResponsePaging<MarketingSavedAudienceGetResponseDto>(
            'marketingAudience.saved.list',
            { dto }
        )
    );
}

export function MarketingSavedAudienceCreateDoc(
    surface: Surface
): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'Save an audience: a preset, or conditions' }),
        DocRequest({
            params: params(surface),
            dto: MarketingSavedAudienceCreateRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        auth(surface),
        DocResponse<MarketingSavedAudienceGetResponseDto>(
            'marketingAudience.saved.create',
            { dto, httpStatus: HttpStatus.CREATED }
        )
    );
}

export function MarketingSavedAudienceUpdateDoc(
    surface: Surface
): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'Rename a saved audience, or replace its preset or conditions',
        }),
        DocRequest({
            params: params(surface, true),
            dto: MarketingSavedAudienceUpdateRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        auth(surface),
        DocResponse<MarketingSavedAudienceGetResponseDto>(
            'marketingAudience.saved.update',
            { dto }
        )
    );
}

export function MarketingSavedAudienceDeleteDoc(
    surface: Surface
): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'Delete a saved audience' }),
        DocRequest({ params: params(surface, true) }),
        auth(surface),
        DocResponse('marketingAudience.saved.delete', {
            httpStatus: HttpStatus.NO_CONTENT,
        })
    );
}
