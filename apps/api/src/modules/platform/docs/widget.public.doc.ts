import {
    Doc,
    DocRequest,
    DocResponse,
} from '@app/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from '@app/common/doc/enums/doc.enum';
import { applyDecorators } from '@nestjs/common';
import { WidgetSendMessageRequestDto } from '../dtos/request/widget.send-message.request.dto';
import {
    WidgetMessageResponseDto,
    WidgetMetaResponseDto,
} from '../dtos/response/widget.response.dto';

export function WidgetMetaDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'read a website widget public configuration',
            description:
                'Branding and allowed origins for a widget key. The key is public — it ships in the embed snippet.',
        }),
        DocResponse('widget.meta', { dto: WidgetMetaResponseDto })
    );
}

export function WidgetSendMessageDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'send a visitor message and stream the reply',
            description:
                "Streams the chatbot reply back on this same request as SSE (`x-vercel-ai-ui-message-stream: v1`). The conversation is persisted, so it appears in the operator inbox like any other channel. Requires a Turnstile token once per visitor session.",
        }),
        DocRequest({
            dto: WidgetSendMessageRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocResponse('widget.sendMessage')
    );
}

export function WidgetMessagesDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'poll for messages after a cursor',
            description:
                'How a visitor receives messages produced outside their own request — an operator reply during handoff, or a follow-up. Polled while the chat window is open.',
        }),
        DocResponse('widget.messages', {
            dto: WidgetMessageResponseDto,
        })
    );
}
