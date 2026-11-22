import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
} from '@app/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from '@app/common/doc/enums/doc.enum';
import { WorkspaceDocParamsId } from '@app/modules/workspace/constants/workspace.doc.constant';
import { applyDecorators } from '@nestjs/common';
import { MarketingSettingsUpdateRequestDto } from '../dtos/request/marketing-settings.update.request.dto';
import { MarketingSettingsGetResponseDto } from '../dtos/response/marketing-settings.get.response.dto';

/** The workspace routes take `:workspace` and a member, the client ones an API key. */
type Surface = 'workspace' | 'client';

const auth = (surface: Surface) =>
    surface === 'client'
        ? DocAuth({ xApiKey: true })
        : DocAuth({ xApiKey: true, jwtAccessToken: true });

const params = (surface: Surface) =>
    surface === 'workspace' ? WorkspaceDocParamsId : [];

const dto = MarketingSettingsGetResponseDto;

export function MarketingSettingsGetDoc(surface: Surface): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Get the send settings: caps, rest rule, hours, opt-out',
        }),
        DocRequest({ params: params(surface) }),
        auth(surface),
        DocResponse<MarketingSettingsGetResponseDto>('marketingSettings.get', {
            dto,
        })
    );
}

export function MarketingSettingsUpdateDoc(surface: Surface): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'Change the send settings; fields left out stay as they are',
        }),
        DocRequest({
            params: params(surface),
            dto: MarketingSettingsUpdateRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        auth(surface),
        DocResponse<MarketingSettingsGetResponseDto>(
            'marketingSettings.update',
            {
                dto,
            }
        )
    );
}
