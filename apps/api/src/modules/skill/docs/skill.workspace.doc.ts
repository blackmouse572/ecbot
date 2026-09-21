import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@app/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from '@app/common/doc/enums/doc.enum';
import { BatchIdsRequestDto } from '@app/common/batch/dtos/batch.request.dto';
import { BatchResultResponseDto } from '@app/common/batch/dtos/batch.response.dto';
import { DatabaseIdResponseDto } from '@app/common/database/dtos/response/database.id.response.dto';
import { WorkspaceDocParamsId } from '@app/modules/workspace/constants/workspace.doc.constant';
import { applyDecorators } from '@nestjs/common';
import { SkillDocParamsId } from '../constants/skill.doc.constant';
import { CreateSkillRequestDto } from '../dtos/request/create-skill.request.dto';
import { UpdateSkillRequestDto } from '../dtos/request/update-skill.request.dto';
import { SkillGetResponseDto } from '../dtos/response/skill.get.response.dto';
import { SkillListResponseDto } from '../dtos/response/skill.list.response.dto';

export function SkillWorkspaceListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'list skills (workspace + builtin)' }),
        DocRequest({ params: [...WorkspaceDocParamsId] }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ policy: true }),
        DocResponsePaging<SkillListResponseDto>('skill.list.success', {
            dto: SkillListResponseDto,
        })
    );
}

export function SkillWorkspaceGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'get a skill (with instructions)' }),
        DocRequest({ params: [...WorkspaceDocParamsId, ...SkillDocParamsId] }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ policy: true }),
        DocResponse('skill.get.success', { dto: SkillGetResponseDto })
    );
}

export function SkillWorkspaceCreateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'create a workspace skill' }),
        DocRequest({
            params: [...WorkspaceDocParamsId],
            dto: CreateSkillRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ policy: true }),
        DocResponse('skill.create.success', { dto: DatabaseIdResponseDto })
    );
}

export function SkillWorkspaceCloneDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'clone a builtin template into a workspace-owned skill',
        }),
        DocRequest({ params: [...WorkspaceDocParamsId, ...SkillDocParamsId] }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ policy: true }),
        DocResponse('skill.clone.success', { dto: DatabaseIdResponseDto })
    );
}

export function SkillWorkspaceUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'update a workspace skill' }),
        DocRequest({
            params: [...WorkspaceDocParamsId, ...SkillDocParamsId],
            dto: UpdateSkillRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ policy: true }),
        DocResponse('skill.update.success', { dto: DatabaseIdResponseDto })
    );
}

export function SkillWorkspaceDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'delete a workspace skill' }),
        DocRequest({ params: [...WorkspaceDocParamsId, ...SkillDocParamsId] }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ policy: true }),
        DocResponse('skill.delete.success')
    );
}

export function SkillWorkspaceBatchDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'delete several workspace skills',
            description:
                'Soft delete every skill in `ids`. Each id is processed independently, so the response reports which ones succeeded and which ones failed.',
        }),
        DocRequest({
            dto: BatchIdsRequestDto,
            params: [...WorkspaceDocParamsId],
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ policy: true }),
        DocResponse<BatchResultResponseDto>('skill.batchDelete.success', {
            dto: BatchResultResponseDto,
        })
    );
}
