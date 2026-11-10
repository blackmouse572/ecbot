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
import { TrackedLinkDocParams } from '../constants/tracked-link.constant';
import { TrackedLinkCreateChildRequestDto } from '../dtos/request/tracked-link.create-child.request.dto';
import { TrackedLinkCreateRequestDto } from '../dtos/request/tracked-link.create.request.dto';
import { TrackedLinkUpdateRequestDto } from '../dtos/request/tracked-link.update.request.dto';
import { TrackedLinkDetailResponseDto } from '../dtos/response/tracked-link.detail.response.dto';
import { TrackedLinkGetResponseDto } from '../dtos/response/tracked-link.get.response.dto';

export function TrackedLinkWorkspaceListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'List customer sources (tracked links)' }),
        DocRequest({ params: [...WorkspaceDocParamsId] }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocResponsePaging<TrackedLinkGetResponseDto>(
            'trackedLink.workspace.list',
            { dto: TrackedLinkGetResponseDto }
        )
    );
}

export function TrackedLinkWorkspaceGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'Get a customer source with its QR and KOL links' }),
        DocRequest({
            params: [...WorkspaceDocParamsId, ...TrackedLinkDocParams],
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocResponse<TrackedLinkDetailResponseDto>('trackedLink.workspace.get', {
            dto: TrackedLinkDetailResponseDto,
        })
    );
}

export function TrackedLinkWorkspaceCreateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'Create a customer source (tracked link)' }),
        DocRequest({
            params: [...WorkspaceDocParamsId],
            dto: TrackedLinkCreateRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocResponse<TrackedLinkGetResponseDto>('trackedLink.workspace.create', {
            dto: TrackedLinkGetResponseDto,
        })
    );
}

export function TrackedLinkWorkspaceCreateChildDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'Add a QR or KOL link under a customer source' }),
        DocRequest({
            params: [...WorkspaceDocParamsId, ...TrackedLinkDocParams],
            dto: TrackedLinkCreateChildRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocResponse<TrackedLinkGetResponseDto>(
            'trackedLink.workspace.createChild',
            { dto: TrackedLinkGetResponseDto }
        )
    );
}

export function TrackedLinkWorkspaceUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'Update a customer source or one of its links' }),
        DocRequest({
            params: [...WorkspaceDocParamsId, ...TrackedLinkDocParams],
            dto: TrackedLinkUpdateRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocResponse<TrackedLinkGetResponseDto>('trackedLink.workspace.update', {
            dto: TrackedLinkGetResponseDto,
        })
    );
}

export function TrackedLinkWorkspaceDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'Delete a customer source and its links' }),
        DocRequest({
            params: [...WorkspaceDocParamsId, ...TrackedLinkDocParams],
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocResponse('trackedLink.workspace.delete')
    );
}
