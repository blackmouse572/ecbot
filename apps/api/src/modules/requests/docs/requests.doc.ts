import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@app/common/doc/decorators/doc.decorator';
import { applyDecorators } from '@nestjs/common';
import { RequestCreateDto } from '../dtos/request/requests.create.request';
import { RequestListResponseDto } from '../dtos/response/requests-list.response.dto';
import { BasedRequestsDocParams } from '../constant/request.doc.constant';

export function RequestListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'List pending join requests of a workspace',
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocGuard({
            role: true,
        }),
        DocRequest({
            params: BasedRequestsDocParams,
        }),
        DocResponsePaging<RequestListResponseDto>('requests.list', {
            dto: RequestListResponseDto,
        })
    );
}

export function CreateRequestsDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Create a request',
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocGuard({
            role: true,
        }),
        DocRequest({
            params: BasedRequestsDocParams,
            dto: RequestCreateDto,
        })
    );
}

export function ApproveRequestDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Approve a request',
            description:
                'This endpoint allows a user to approve a request by its ID.',
        }),
        DocAuth({
            jwtAccessToken: true,
        }),
        DocGuard({
            role: true,
        }),
        DocRequest({
            params: [
                ...BasedRequestsDocParams,
                {
                    name: 'id',
                    type: 'string',
                    description: 'The ID of the request to approve.',
                    example: '099110af-9613-4d16-873d-dd0b0610175a',
                },
            ],
        }),
        DocResponse('requests.approve.success')
    );
}
