import { applyDecorators } from '@nestjs/common';
import { DatabaseIdResponseDto } from 'src/common/database/dtos/response/database.id.response.dto';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from 'src/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from 'src/common/doc/enums/doc.enum';
import {
    ToolDocParamsChatbotId,
    ToolDocParamsId,
    ToolDocQueryKind,
    ToolDocQueryStatus,
} from '../constants/tool.doc.constant';
import { CreateHttpToolRequestDto } from '../dtos/request/create-http-tool.request.dto';
import { CreateMcpToolRequestDto } from '../dtos/request/create-mcp-tool.request.dto';
import { EnableOnChatbotRequestDto } from '../dtos/request/enable-on-chatbot.request.dto';
import { UpdateToolRequestDto } from '../dtos/request/update-tool.request.dto';
import { ChatbotToolListResponseDto } from '../dtos/response/chatbot-tool-list.response.dto';
import { ToolListResponseDto } from '../dtos/response/tool.list.response.dto';
import { ToolResponseDto } from '../dtos/response/tool.response.dto';

export function ToolClientListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'list the tools of the credential workspace' }),
        DocRequest({
            queries: [...ToolDocQueryKind, ...ToolDocQueryStatus],
        }),
        DocAuth({ xApiKey: true }),
        DocResponsePaging('tool.list.success', { dto: ToolListResponseDto })
    );
}

export function ToolClientGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'get a tool of the credential workspace' }),
        DocRequest({
            params: ToolDocParamsId,
        }),
        DocAuth({ xApiKey: true }),
        DocResponse('tool.get.success', { dto: ToolResponseDto })
    );
}

export function ToolClientCreateHttpDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'create an HTTP tool in the credential workspace' }),
        DocRequest({
            dto: CreateHttpToolRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({ xApiKey: true }),
        DocResponse('tool.create.success', { dto: DatabaseIdResponseDto })
    );
}

export function ToolClientCreateMcpDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'connect an MCP server as a tool in the credential workspace',
        }),
        DocRequest({
            dto: CreateMcpToolRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({ xApiKey: true }),
        DocResponse('tool.create.success', { dto: DatabaseIdResponseDto })
    );
}

export function ToolClientUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'update a tool of the credential workspace' }),
        DocRequest({
            params: ToolDocParamsId,
            dto: UpdateToolRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({ xApiKey: true }),
        DocResponse('tool.update.success', { dto: DatabaseIdResponseDto })
    );
}

export function ToolClientDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'delete a tool of the credential workspace' }),
        DocRequest({
            params: ToolDocParamsId,
        }),
        DocAuth({ xApiKey: true }),
        DocResponse('tool.delete.success', { dto: DatabaseIdResponseDto })
    );
}

export function ChatbotToolClientListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'list the tools a chatbot of the credential workspace can call',
        }),
        DocRequest({
            params: ToolDocParamsChatbotId,
        }),
        DocAuth({ xApiKey: true }),
        DocResponse('tool.chatbot.list.success', {
            dto: ChatbotToolListResponseDto,
        })
    );
}

export function ChatbotToolClientEnableDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'let a chatbot of the credential workspace call a tool',
        }),
        DocRequest({
            params: [...ToolDocParamsChatbotId, ...ToolDocParamsId],
            dto: EnableOnChatbotRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({ xApiKey: true }),
        DocResponse('tool.enable.success', { dto: DatabaseIdResponseDto })
    );
}

export function ChatbotToolClientDisableDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'stop a chatbot of the credential workspace calling a tool',
        }),
        DocRequest({
            params: [...ToolDocParamsChatbotId, ...ToolDocParamsId],
        }),
        DocAuth({ xApiKey: true }),
        DocResponse('tool.disable.success', { dto: DatabaseIdResponseDto })
    );
}
