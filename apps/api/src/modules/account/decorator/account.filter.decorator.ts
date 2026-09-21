import { Query } from '@nestjs/common';
import { AccountChatbotFilterPipe } from '../pipe/account.chatbot-filter.pipe';

/**
 * Binds a chatbot query param to {@link AccountChatbotFilterPipe}, so the
 * handler receives a ready-made find fragment instead of the raw id.
 *
 * @param options.field entity field the exclusion is written against
 * @param options.queryField query key to read — defaults to `field`, else `chatbot`
 */
export function AccountChatbotQueryFilter(options?: {
    field?: string;
    queryField?: string;
}): ParameterDecorator {
    const { field, queryField } = options ?? {};
    const key = queryField ?? field ?? 'chatbot';

    return Query(key, AccountChatbotFilterPipe(field));
}
