import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@app/common/doc/decorators/doc.decorator';
import { applyDecorators } from '@nestjs/common';
import {
    CustomerAdminDocParamsId,
    CustomerAdminDocQueryFilters,
} from '../constants/customer.doc.constant';
import { CustomerAdminGetResponseDto } from '../dtos/response/customer.admin-get.response.dto';
import { CustomerAdminListResponseDto } from '../dtos/response/customer.admin-list.response.dto';

export function CustomerAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'list customers across every workspace, newest first' }),
        DocRequest({ queries: [...CustomerAdminDocQueryFilters] }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ role: true, policy: true }),
        DocResponsePaging<CustomerAdminListResponseDto>('customer.admin.list', {
            dto: CustomerAdminListResponseDto,
        })
    );
}

export function CustomerAdminGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'get one customer with their channels, tags and conversation count',
        }),
        DocRequest({ params: [...CustomerAdminDocParamsId] }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ role: true, policy: true }),
        DocResponse('customer.admin.get', {
            dto: CustomerAdminGetResponseDto,
        })
    );
}
