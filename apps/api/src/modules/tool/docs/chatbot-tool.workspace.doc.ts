import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
    ApiExtraModels,
    ApiProduces,
    ApiResponse,
    getSchemaPath,
} from '@nestjs/swagger';
import { DatabaseIdResponseDto } from 'src/common/database/dtos/response/database.id.response.dto';
import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
} from 'src/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from 'src/common/doc/enums/doc.enum';
import { ResponseDto } from 'src/common/response/dtos/response.dto';
import { EnableOnChatbotRequestDto } from 'src/modules/tool/dtos/request/enable-on-chatbot.request.dto';
import { UpdateEnabledActionsRequestDto } from 'src/modules/tool/dtos/request/update-enabled-actions.request.dto';
import { ChatbotToolListResponseDto } from 'src/modules/tool/dtos/response/chatbot-tool-list.response.dto';
import { ToolInvocationResponseDto } from 'src/modules/tool/dtos/response/tool-invocation.response.dto';

export function ChatbotToolWorkspaceListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'list enabled tools for a chatbot',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocRequest({
            params: [{ name: 'chatbotId' }],
        }),
        ApiExtraModels(ResponseDto, ChatbotToolListResponseDto),
        ApiProduces('application/json'),
        ApiResponse({
            status: HttpStatus.OK,
            schema: {
                allOf: [{ $ref: getSchemaPath(ResponseDto) }],
                properties: {
                    message: { example: 'tool.chatbot.list.success' },
                    statusCode: { type: 'number', example: HttpStatus.OK },
                    data: {
                        type: 'array',
                        items: {
                            $ref: getSchemaPath(ChatbotToolListResponseDto),
                        },
                    },
                },
            },
        })
    );
}

export function ChatbotToolWorkspaceEnableDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'enable a tool on a chatbot',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocRequest({
            params: [{ name: 'chatbotId' }, { name: 'toolId' }],
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: EnableOnChatbotRequestDto,
        }),
        DocResponse<DatabaseIdResponseDto>('tool.enable.success', {
            dto: DatabaseIdResponseDto,
        })
    );
}

export function ChatbotToolWorkspaceDisableDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'disable a tool on a chatbot',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocRequest({
            params: [{ name: 'chatbotId' }, { name: 'toolId' }],
        }),
        DocResponse<DatabaseIdResponseDto>('tool.disable.success', {
            dto: DatabaseIdResponseDto,
        })
    );
}

export function ChatbotToolWorkspaceListInvocationsDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'list recent tool invocations for a chatbot',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocRequest({
            params: [{ name: 'chatbotId' }],
        }),
        DocResponse<ToolInvocationResponseDto>(
            'tool.invocations.list.success',
            {
                dto: ToolInvocationResponseDto,
            }
        )
    );
}

export function ChatbotToolWorkspaceUpdateActionsDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'update enabled actions for a chatbot tool',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocRequest({
            params: [{ name: 'chatbotId' }, { name: 'toolId' }],
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: UpdateEnabledActionsRequestDto,
        }),
        DocResponse<DatabaseIdResponseDto>('tool.updateActions.success', {
            dto: DatabaseIdResponseDto,
        })
    );
}
