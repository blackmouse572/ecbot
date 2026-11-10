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
import {
    OrderDocParamsId,
    OrderDocQueryFilters,
} from '../constants/order.doc.constant';
import { OrderImportRequestDto } from '../dtos/request/order-import.request.dto';
import { OrderCreateRequestDto } from '../dtos/request/order.create.request.dto';
import { OrderUpdateRequestDto } from '../dtos/request/order.update.request.dto';
import { OrderImportResponseDto } from '../dtos/response/order-import.response.dto';
import { OrderGetResponseDto } from '../dtos/response/order.get.response.dto';

const auth = () => DocAuth({ xApiKey: true, jwtAccessToken: true });

export function OrderWorkspaceListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'List orders' }),
        DocRequest({
            params: [...WorkspaceDocParamsId],
            queries: [...OrderDocQueryFilters],
        }),
        auth(),
        DocResponsePaging<OrderGetResponseDto>('order.workspace.list', {
            dto: OrderGetResponseDto,
        })
    );
}

export function OrderWorkspaceGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'Get an order' }),
        DocRequest({ params: [...WorkspaceDocParamsId, ...OrderDocParamsId] }),
        auth(),
        DocResponse<OrderGetResponseDto>('order.workspace.get', {
            dto: OrderGetResponseDto,
        })
    );
}

export function OrderWorkspaceCreateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'Add an order by hand' }),
        DocRequest({
            params: [...WorkspaceDocParamsId],
            dto: OrderCreateRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        auth(),
        DocResponse<OrderGetResponseDto>('order.workspace.create', {
            dto: OrderGetResponseDto,
        })
    );
}

export function OrderWorkspaceUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'Update an order' }),
        DocRequest({
            params: [...WorkspaceDocParamsId, ...OrderDocParamsId],
            dto: OrderUpdateRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        auth(),
        DocResponse<OrderGetResponseDto>('order.workspace.update', {
            dto: OrderGetResponseDto,
        })
    );
}

export function OrderWorkspaceConfirmDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'Confirm a pending order' }),
        DocRequest({ params: [...WorkspaceDocParamsId, ...OrderDocParamsId] }),
        auth(),
        DocResponse<OrderGetResponseDto>('order.workspace.confirm', {
            dto: OrderGetResponseDto,
        })
    );
}

export function OrderWorkspaceCancelDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'Cancel an order' }),
        DocRequest({ params: [...WorkspaceDocParamsId, ...OrderDocParamsId] }),
        auth(),
        DocResponse<OrderGetResponseDto>('order.workspace.cancel', {
            dto: OrderGetResponseDto,
        })
    );
}

export function OrderWorkspaceImportDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Import orders from mapped CSV rows',
            description:
                'Rows sharing a code are one order; existing codes are skipped. Send dryRun for the preview counts.',
        }),
        DocRequest({
            params: [...WorkspaceDocParamsId],
            dto: OrderImportRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        auth(),
        DocResponse<OrderImportResponseDto>('order.workspace.import', {
            dto: OrderImportResponseDto,
        })
    );
}
