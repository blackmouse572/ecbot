import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
} from '@app/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from '@app/common/doc/enums/doc.enum';
import { applyDecorators } from '@nestjs/common';
import {
    CustomerTagAssignmentDocParams,
    CustomerTagDocParams,
} from '../constants/customer-tag.params.constant';
import { CustomerTagCreateRequestDto } from '../dtos/request/customer-tag.create.request.dto';
import { CustomerTagUpdateRequestDto } from '../dtos/request/customer-tag.update.request.dto';
import { CustomerTagAssignmentGetResponseDto } from '../dtos/response/customer-tag-assignment.get.response.dto';
import { CustomerTagGetResponseDto } from '../dtos/response/customer-tag.get.response.dto';

export function CustomerTagClientListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'list the customer tags of the credential workspace' }),
        DocAuth({ xApiKey: true }),
        DocResponse<CustomerTagGetResponseDto>('customerTag.workspace.list', {
            dto: CustomerTagGetResponseDto,
        })
    );
}

export function CustomerTagClientCreateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'create a customer tag in the credential workspace' }),
        DocRequest({
            dto: CustomerTagCreateRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({ xApiKey: true }),
        DocResponse<CustomerTagGetResponseDto>('customerTag.workspace.create', {
            dto: CustomerTagGetResponseDto,
        })
    );
}

export function CustomerTagClientUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'update a customer tag of the credential workspace' }),
        DocRequest({
            params: CustomerTagDocParams,
            dto: CustomerTagUpdateRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({ xApiKey: true }),
        DocResponse<CustomerTagGetResponseDto>('customerTag.workspace.update', {
            dto: CustomerTagGetResponseDto,
        })
    );
}

export function CustomerTagClientDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'delete a customer tag of the credential workspace, removing it from every customer',
        }),
        DocRequest({ params: CustomerTagDocParams }),
        DocAuth({ xApiKey: true }),
        DocResponse('customerTag.workspace.delete')
    );
}

export function CustomerTagAssignmentClientListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'list the tags of a customer in the credential workspace',
        }),
        DocRequest({ params: CustomerTagAssignmentDocParams.slice(0, 1) }),
        DocAuth({ xApiKey: true }),
        DocResponse<CustomerTagAssignmentGetResponseDto>(
            'customerTagAssignment.workspace.list',
            { dto: CustomerTagAssignmentGetResponseDto }
        )
    );
}

export function CustomerTagAssignmentClientApplyDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'tag a customer in the credential workspace' }),
        DocRequest({ params: CustomerTagAssignmentDocParams }),
        DocAuth({ xApiKey: true }),
        DocResponse<CustomerTagAssignmentGetResponseDto>(
            'customerTagAssignment.workspace.apply',
            { dto: CustomerTagAssignmentGetResponseDto }
        )
    );
}

export function CustomerTagAssignmentClientRemoveDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'untag a customer in the credential workspace' }),
        DocRequest({ params: CustomerTagAssignmentDocParams }),
        DocAuth({ xApiKey: true }),
        DocResponse('customerTagAssignment.workspace.remove')
    );
}
