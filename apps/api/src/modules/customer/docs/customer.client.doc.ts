import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@app/common/doc/decorators/doc.decorator';
import { applyDecorators } from '@nestjs/common';
import { CustomerDocParamsId } from '../constants/customer.doc.constant';
import { CustomerGetResponseDto } from '../dtos/response/customer.get.response.dto';

export function CustomerClientListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'list the customers of the credential workspace' }),
        DocAuth({ xApiKey: true }),
        DocResponsePaging<CustomerGetResponseDto>('customer.workspace.list', {
            dto: CustomerGetResponseDto,
        })
    );
}

export function CustomerClientGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'get a customer of the credential workspace' }),
        DocRequest({ params: CustomerDocParamsId }),
        DocAuth({ xApiKey: true }),
        DocResponse<CustomerGetResponseDto>('customer.workspace.get', {
            dto: CustomerGetResponseDto,
        })
    );
}
