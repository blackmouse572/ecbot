import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
} from '@app/common/doc/decorators/doc.decorator';
import { WorkspaceDocParamsId } from '@app/modules/workspace/constants/workspace.doc.constant';
import { applyDecorators } from '@nestjs/common';
import { CustomerDataExportResponseDto } from '../dtos/response/customer-data-export.response.dto';
import { UserDataExportResponseDto } from '../dtos/response/user-data-export.response.dto';

export function ExportUserMeDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'Download a copy of my personal data (JSON)' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocResponse<UserDataExportResponseDto>('export.user', {
            dto: UserDataExportResponseDto,
        })
    );
}

export function ExportWorkspaceCustomerDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'Download everything stored about a customer (JSON), for a data subject request',
        }),
        DocRequest({ params: [...WorkspaceDocParamsId] }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocResponse<CustomerDataExportResponseDto>('export.customer', {
            dto: CustomerDataExportResponseDto,
        })
    );
}
