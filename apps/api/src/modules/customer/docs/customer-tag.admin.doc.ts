import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponsePaging,
} from '@app/common/doc/decorators/doc.decorator';
import { applyDecorators } from '@nestjs/common';
import { CustomerTagAdminDocQueryFilters } from '../constants/customer.doc.constant';
import { CustomerTagAdminListResponseDto } from '../dtos/response/customer-tag.admin-list.response.dto';

export function CustomerTagAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'list customer tags across every workspace, newest first, with customer counts',
        }),
        DocRequest({ queries: [...CustomerTagAdminDocQueryFilters] }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ role: true, policy: true }),
        DocResponsePaging<CustomerTagAdminListResponseDto>(
            'customer.admin.tagList',
            { dto: CustomerTagAdminListResponseDto }
        )
    );
}
