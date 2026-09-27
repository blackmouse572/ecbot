import { JsonType, Platform } from '@mikro-orm/core';
import { IMessageAttachment } from '../../interfaces/message-media.interface';
import { parseAttachments } from '../../utils/message-attachment';

/** The jsonb `attachments` column, parsed into typed attachments once, as
 *  rows are read. The column itself is unchanged (no migration). */
export class MessageAttachmentsType extends JsonType {
    override convertToJSValue(
        value: unknown,
        platform: Platform
    ): IMessageAttachment[] | null | undefined {
        if (value === null || value === undefined) return value as null;
        const json =
            typeof value === 'string'
                ? platform.convertJsonToJSValue(value)
                : value;
        return parseAttachments(json);
    }
}
