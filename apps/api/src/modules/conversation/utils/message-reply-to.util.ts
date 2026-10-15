import { MessageReplyToResponseDto } from '../dtos/response/message.get.response.dto';
import { IMessageReplyTo } from '../interfaces/message-media.interface';

/** A stored reply as the inbox gets it: no platform ids. */
export function toReplyToDto(
    replyTo: IMessageReplyTo | undefined
): MessageReplyToResponseDto | undefined {
    if (!replyTo) return undefined;
    const { kind, messageId, text, fromCustomer } = replyTo;
    return {
        kind,
        ...(messageId && { messageId }),
        ...(text && { text }),
        ...(fromCustomer !== undefined && { fromCustomer }),
    };
}
