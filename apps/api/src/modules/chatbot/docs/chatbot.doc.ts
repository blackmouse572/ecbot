import {
    BatchIdsRequestDto,
    BatchIdsWithActiveRequestDto,
} from '@app/common/batch/dtos/batch.request.dto';
import { BatchResultResponseDto } from '@app/common/batch/dtos/batch.response.dto';
import { ENUM_DOC_REQUEST_BODY_TYPE } from '@app/common/doc/enums/doc.enum';
import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from 'src/common/doc/decorators/doc.decorator';
import {
    BasedChatbotDocParams,
    ChatbotDocParamsId,
} from '../constants/chatbot.doc.constant';
import { CloneChatbotRequestDto } from '../dtos/request/chatbot.clone.request.dto';
import { ChatbotCreateRequestDto } from '../dtos/request/chatbot.create.request.dto';
import { ChatbotLinkAccountRequestDto } from '../dtos/request/chatbot.link-account.request.dto';
import { ChatbotUpdateRequestDto } from '../dtos/request/chatbot.update.request.dto';
import { ChatbotCreateResponseDto } from '../dtos/response/chatbot.create.response.dto';
import { ChatbotGetDetailResponseDto } from '../dtos/response/chatbot.detail.response.dto';
import { ChatbotListResponseDto } from '../dtos/response/chatbot.list.response.dto';
import { ChatbotModelResponseDto } from '../dtos/response/chatbot.model.response.dto';
import { ChatbotShareLinkRequestDto } from '../dtos/request/chatbot.share-link.request.dto';
import { ChatbotShareLinkResponseDto } from '../dtos/response/chatbot.share-link.response.dto';
import { ChatbotStreamRequestDto } from '../dtos/request/chatbot.stream.request.dto';
import { ChatbotPreviewMetaResponseDto } from '../dtos/response/chatbot.preview-meta.response.dto';
import { ChatbotPreviewStreamRequestDto } from '../dtos/request/chatbot.preview-stream.request.dto';

export function ChatbotCreateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'create a new chatbot for order management',
            description:
                'Create a chatbot that can handle CRUD operations for orders. The chatbot uses AI to understand customer requests and perform order-related tasks.',
        }),
        DocRequest({
            dto: ChatbotCreateRequestDto,
            params: BasedChatbotDocParams,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ policy: true }),
        DocResponse<ChatbotCreateResponseDto>('chatbot.create', {
            dto: ChatbotCreateResponseDto,
            httpStatus: HttpStatus.CREATED,
        })
    );
}

export function ChatbotListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all chatbots in workspace',
            description:
                'Retrieve a paginated list of all chatbots in the current workspace.',
        }),
        DocRequest({
            queries: [
                {
                    name: 'account',
                    type: String,
                    required: false,
                    description: 'Account ID used to filter the chatbot list.',
                },
            ],
            params: BasedChatbotDocParams,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ policy: true }),
        DocResponsePaging<ChatbotListResponseDto>('chatbot.list', {
            dto: ChatbotListResponseDto,
        })
    );
}

export function ChatbotModelsDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get available chatbot models',
            description:
                'Retrieve the catalog of AI models available for chatbot configuration, sourced from the model gateway.',
        }),
        DocRequest({
            params: BasedChatbotDocParams,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ policy: true }),
        DocResponse<ChatbotModelResponseDto>('chatbot.models', {
            dto: ChatbotModelResponseDto,
            isArray: true,
        })
    );
}

export function ChatbotGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get chatbot details',
            description:
                'Retrieve detailed information about a specific chatbot including its configuration and shop knowledge.',
        }),
        DocRequest({
            params: ChatbotDocParamsId,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ policy: true }),
        DocResponse<ChatbotGetDetailResponseDto>('chatbot.get', {
            dto: ChatbotGetDetailResponseDto,
        })
    );
}

export function ChatbotUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'update chatbot configuration',
            description:
                'Update chatbot name, avatar, or shop knowledge information.',
        }),
        DocRequest({
            params: ChatbotDocParamsId,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: ChatbotUpdateRequestDto,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ policy: true }),
        DocResponse('chatbot.update')
    );
}

export function ChatbotDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'delete a chatbot',
            description:
                'Soft delete a chatbot. The chatbot will be marked as deleted but not permanently removed.',
        }),
        DocRequest({
            params: ChatbotDocParamsId,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ policy: true }),
        DocResponse('chatbot.delete')
    );
}

export function ChatbotBatchDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'delete several chatbots',
            description:
                'Soft delete every chatbot in `ids`. Each id is processed independently, so the response reports which ones succeeded and which ones failed.',
        }),
        DocRequest({
            dto: BatchIdsRequestDto,
            params: BasedChatbotDocParams,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ policy: true }),
        DocResponse<BatchResultResponseDto>('chatbot.batchDelete', {
            httpStatus: HttpStatus.OK,
            dto: BatchResultResponseDto,
        })
    );
}

export function ChatbotBatchStatusDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'activate or deactivate several chatbots',
            description:
                'Set every chatbot in `ids` to active or inactive. Each id is processed independently, so the response reports which ones succeeded and which ones failed.',
        }),
        DocRequest({
            dto: BatchIdsWithActiveRequestDto,
            params: BasedChatbotDocParams,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ policy: true }),
        DocResponse<BatchResultResponseDto>('chatbot.batchStatus', {
            httpStatus: HttpStatus.OK,
            dto: BatchResultResponseDto,
        })
    );
}

export function ChatbotActiveDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'activate a chatbot' }),
        DocRequest({ params: ChatbotDocParamsId }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ policy: true }),
        DocResponse<boolean>('chatbot.active', {
            httpStatus: HttpStatus.OK,
        })
    );
}

export function ChatbotInactiveDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'deactivate a chatbot' }),
        DocRequest({ params: ChatbotDocParamsId }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ policy: true }),
        DocResponse<boolean>('chatbot.inactive', {
            httpStatus: HttpStatus.OK,
        })
    );
}

export function ChatbotArchiveDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'archive a chatbot' }),
        DocRequest({ params: ChatbotDocParamsId }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ policy: true }),
        DocResponse<boolean>('chatbot.archive', {
            httpStatus: HttpStatus.OK,
        })
    );
}

export function ChatbotUnarchiveDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'unarchive a chatbot' }),
        DocRequest({ params: ChatbotDocParamsId }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ policy: true }),
        DocResponse<boolean>('chatbot.unarchive', {
            httpStatus: HttpStatus.OK,
        })
    );
}

export function ChatbotLinkAccountDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'link an account to chatbot' }),
        DocRequest({
            params: ChatbotDocParamsId,
            dto: ChatbotLinkAccountRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ policy: true }),
        DocResponse<boolean>('chatbot.linkAccount', {
            httpStatus: HttpStatus.OK,
        })
    );
}

export function ChatbotUnlinkAccountDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'unlink an account from chatbot' }),
        DocRequest({
            params: ChatbotDocParamsId,
            dto: ChatbotLinkAccountRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ policy: true }),
        DocResponse<boolean>('chatbot.unlinkAccount', {
            httpStatus: HttpStatus.OK,
        })
    );
}

export function ChatbotCloneDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'clone a chatbot',
            description:
                'Clone an existing chatbot with its configuration. Optionally clone tools, knowledge items, and RAG documents. The cloned chatbot is created with inactive status.',
        }),
        DocRequest({
            params: ChatbotDocParamsId,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: CloneChatbotRequestDto,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ policy: true }),
        DocResponse<ChatbotListResponseDto>('chatbot.clone', {
            dto: ChatbotListResponseDto,
            httpStatus: HttpStatus.CREATED,
        })
    );
}

export function ChatbotStreamDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'stream a preview chat turn',
            description:
                'Server-sent events in the AI SDK v5 UI message stream format. The conversation is kept as an ephemeral Redis session keyed by `chat_session_id`, so the bot remembers earlier turns.',
        }),
        DocRequest({
            dto: ChatbotStreamRequestDto,
            params: ChatbotDocParamsId,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ policy: true })
    );
}

export function ChatbotCreateShareLinkDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'create a public preview share link',
            description:
                'Mints a signed, time-limited link that lets anyone chat with this bot without signing in. The token is self-contained: it cannot be revoked, only outlived.',
        }),
        DocRequest({
            dto: ChatbotShareLinkRequestDto,
            params: ChatbotDocParamsId,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ policy: true }),
        DocResponse<ChatbotShareLinkResponseDto>('chatbot.shareLink', {
            dto: ChatbotShareLinkResponseDto,
            httpStatus: HttpStatus.CREATED,
        })
    );
}

export function ChatbotPreviewMetaDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'read the public profile of a shared chatbot preview',
            description:
                'Everything an anonymous visitor may know about the bot behind a share link. Deliberately excludes the prompt, model and guardrail configuration.',
        }),
        DocResponse<ChatbotPreviewMetaResponseDto>('chatbot.preview', {
            dto: ChatbotPreviewMetaResponseDto,
        })
    );
}

export function ChatbotPreviewStreamDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'stream a preview chat turn through a share link',
            description:
                'Same SSE contract as the authed preview. The share token travels in the body rather than the path so it stays out of access logs.',
        }),
        DocRequest({
            dto: ChatbotPreviewStreamRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        })
    );
}
