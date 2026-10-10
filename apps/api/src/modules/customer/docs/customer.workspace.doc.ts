import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@app/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from '@app/common/doc/enums/doc.enum';
import { WorkspaceDocParamsId } from '@app/modules/workspace/constants/workspace.doc.constant';
import { applyDecorators } from '@nestjs/common';
import { CustomerUpdateRequestDto } from '../dtos/request/customer.update.request.dto';
import { ContactPointGetResponseDto } from '../dtos/response/contact-point.get.response.dto';
import { CustomerEraseResponseDto } from '../dtos/response/customer.erase.response.dto';
import { CustomerGetResponseDto } from '../dtos/response/customer.get.response.dto';

export function CustomerWorkspaceListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'List the customers of a workspace' }),
        DocRequest({ params: [...WorkspaceDocParamsId] }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocResponsePaging<CustomerGetResponseDto>('customer.workspace.list', {
            dto: CustomerGetResponseDto,
        })
    );
}

export function CustomerWorkspaceGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'Get a customer' }),
        DocRequest({ params: [...WorkspaceDocParamsId] }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocResponse<CustomerGetResponseDto>('customer.workspace.get', {
            dto: CustomerGetResponseDto,
        })
    );
}

export function CustomerWorkspaceUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'Update a customer profile' }),
        DocRequest({
            params: [...WorkspaceDocParamsId],
            dto: CustomerUpdateRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocResponse<CustomerGetResponseDto>('customer.workspace.update', {
            dto: CustomerGetResponseDto,
        })
    );
}

export function CustomerWorkspaceEraseDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'Permanently delete a customer, every profile merged into it, their contact points, conversations, messages and media. Workspace owner or admin only.',
        }),
        DocRequest({ params: [...WorkspaceDocParamsId] }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocResponse<CustomerEraseResponseDto>('customer.workspace.erase', {
            dto: CustomerEraseResponseDto,
        })
    );
}

export function ContactPointWorkspaceListByCustomerDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'List contact points for a customer' }),
        DocRequest({ params: [...WorkspaceDocParamsId] }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocResponsePaging<ContactPointGetResponseDto>(
            'contactPoint.workspace.listByCustomer',
            { dto: ContactPointGetResponseDto }
        )
    );
}
