import {
    Doc,
    DocAuth,
    DocResponse,
} from '@app/common/doc/decorators/doc.decorator';
import { applyDecorators } from '@nestjs/common';
import { ClientCredentialMeResponseDto } from '../dtos/response/client-credential.me.response.dto';

export function ClientCredentialMeDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'resolve the workspace this client credential belongs to and what it may do there',
        }),
        DocAuth({ xApiKey: true }),
        DocResponse('clientCredential.me', {
            dto: ClientCredentialMeResponseDto,
        })
    );
}
