import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
} from '@app/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from '@app/common/doc/enums/doc.enum';
import { WorkspaceDocParamsId } from '@app/modules/workspace/constants/workspace.doc.constant';
import { applyDecorators } from '@nestjs/common';
import {
    CustomerTagAssignmentDocParams,
    CustomerTagDocParams,
} from '../constants/customer-tag.params.constant';
import { CustomerTagCreateRequestDto } from '../dtos/request/customer-tag.create.request.dto';
import { CustomerTagUpdateRequestDto } from '../dtos/request/customer-tag.update.request.dto';
import { CustomerTagAssignmentGetResponseDto } from '../dtos/response/customer-tag-assignment.get.response.dto';
import { CustomerTagGetResponseDto } from '../dtos/response/customer-tag.get.response.dto';

export function CustomerTagWorkspaceListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'List customer tag catalog' }),
        DocRequest({ params: [...WorkspaceDocParamsId] }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocResponse<CustomerTagGetResponseDto>('customerTag.workspace.list', {
            dto: CustomerTagGetResponseDto,
        })
    );
}

export function CustomerTagWorkspaceGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'Get a customer tag' }),
        DocRequest({
            params: [...WorkspaceDocParamsId, ...CustomerTagDocParams],
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocResponse<CustomerTagGetResponseDto>('customerTag.workspace.get', {
            dto: CustomerTagGetResponseDto,
        })
    );
}

export function CustomerTagWorkspaceCreateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'Create a customer tag' }),
        DocRequest({
            params: [...WorkspaceDocParamsId],
            dto: CustomerTagCreateRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocResponse<CustomerTagGetResponseDto>('customerTag.workspace.create', {
            dto: CustomerTagGetResponseDto,
        })
    );
}

export function CustomerTagWorkspaceUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'Update a customer tag' }),
        DocRequest({
            params: [...WorkspaceDocParamsId, ...CustomerTagDocParams],
            dto: CustomerTagUpdateRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocResponse<CustomerTagGetResponseDto>('customerTag.workspace.update', {
            dto: CustomerTagGetResponseDto,
        })
    );
}

export function CustomerTagWorkspaceDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'Delete a customer tag' }),
        DocRequest({
            params: [...WorkspaceDocParamsId, ...CustomerTagDocParams],
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocResponse('customerTag.workspace.delete')
    );
}

export function CustomerTagAssignmentWorkspaceListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'List tag assignments for a customer' }),
        DocRequest({
            params: [
                ...WorkspaceDocParamsId,
                ...CustomerTagAssignmentDocParams.slice(0, 1),
            ],
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocResponse<CustomerTagAssignmentGetResponseDto>(
            'customerTagAssignment.workspace.list',
            { dto: CustomerTagAssignmentGetResponseDto }
        )
    );
}

export function CustomerTagAssignmentWorkspaceApplyDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'Apply a tag to a customer' }),
        DocRequest({
            params: [
                ...WorkspaceDocParamsId,
                ...CustomerTagAssignmentDocParams,
            ],
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocResponse<CustomerTagAssignmentGetResponseDto>(
            'customerTagAssignment.workspace.apply',
            { dto: CustomerTagAssignmentGetResponseDto }
        )
    );
}

export function CustomerTagAssignmentWorkspaceRemoveDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'Remove a tag from a customer' }),
        DocRequest({
            params: [
                ...WorkspaceDocParamsId,
                ...CustomerTagAssignmentDocParams,
            ],
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocResponse('customerTagAssignment.workspace.remove')
    );
}
