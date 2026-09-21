import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
} from '@app/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from '@app/common/doc/enums/doc.enum';
import { applyDecorators } from '@nestjs/common';
import { ApiChannelSendMessageRequestDto } from '../dtos/request/api-channel.send-message.request.dto';
import { ApiChannelSendMessageResponseDto } from '../dtos/response/api-channel.send-message.response.dto';

export function ApiChannelSendMessageDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'send an end-user message to an API channel chatbot',
            description:
                "Accepts the message for processing and returns immediately. The bot's reply is POSTed to the account's callback URL, signed with `x-eccho-signature` (HMAC-SHA256 over `<timestamp>.<body>`).",
        }),
        DocRequest({
            dto: ApiChannelSendMessageRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({ xApiKey: true }),
        DocResponse('apiChannel.sendMessage', {
            dto: ApiChannelSendMessageResponseDto,
        })
    );
}
