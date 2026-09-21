import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@app/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from '@app/common/doc/enums/doc.enum';
import { DatabaseIdResponseDto } from '@app/common/database/dtos/response/database.id.response.dto';
import { applyDecorators } from '@nestjs/common';
import { SkillDocParamsId } from '../constants/skill.doc.constant';
import { CreateSkillRequestDto } from '../dtos/request/create-skill.request.dto';
import { UpdateSkillRequestDto } from '../dtos/request/update-skill.request.dto';
import { SkillGetResponseDto } from '../dtos/response/skill.get.response.dto';
import { SkillListResponseDto } from '../dtos/response/skill.list.response.dto';

export function SkillAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'list skills — builtin templates or all skills system-wide',
        }),
        DocRequest({
            queries: [
                {
                    name: 'source',
                    required: false,
                    enum: ['builtin', 'all'],
                },
            ],
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ policy: true }),
        DocResponsePaging<SkillListResponseDto>('skill.list.success', {
            dto: SkillListResponseDto,
        })
    );
}

export function SkillAdminGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'get a builtin skill template (with instructions)' }),
        DocRequest({ params: [...SkillDocParamsId] }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ policy: true }),
        DocResponse('skill.get.success', { dto: SkillGetResponseDto })
    );
}

export function SkillAdminCreateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'create a builtin skill template' }),
        DocRequest({
            dto: CreateSkillRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ policy: true }),
        DocResponse('skill.create.success', { dto: DatabaseIdResponseDto })
    );
}

export function SkillAdminUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'update a builtin skill template' }),
        DocRequest({
            params: [...SkillDocParamsId],
            dto: UpdateSkillRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ policy: true }),
        DocResponse('skill.update.success', { dto: DatabaseIdResponseDto })
    );
}

export function SkillAdminDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'delete a builtin skill template' }),
        DocRequest({ params: [...SkillDocParamsId] }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ policy: true }),
        DocResponse('skill.delete.success')
    );
}
