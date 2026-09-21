import { DatabaseService } from '@app/common/database/services/database.service';
import {
    Injectable,
    mixin,
    NotFoundException,
    PipeTransform,
    Type,
} from '@nestjs/common';
import { ENUM_ACCOUNT_STATUS_CODE_ERROR } from 'src/modules/account/enums/account.status-code.enum';
import { ChatbotService } from 'src/modules/chatbot/services/chatbot.service';

function chatbotNotFound(): NotFoundException {
    return new NotFoundException({
        statusCode: ENUM_ACCOUNT_STATUS_CODE_ERROR.NOT_FOUND,
        message: 'chatbot.error.notFound',
    });
}

/**
 * Turns a chatbot id into a find fragment that hides the accounts that chatbot
 * already owns — the "pick an account to link" list. Without the query param
 * nothing is filtered out.
 *
 * @param field entity field the exclusion is written against, default `id`
 */
export function AccountChatbotFilterPipe(field?: string): Type<PipeTransform> {
    @Injectable()
    class MixinAccountChatbotFilterPipe implements PipeTransform {
        constructor(
            private readonly chatbotService: ChatbotService,
            private readonly databaseService: DatabaseService
        ) {}

        async transform(chatbotId?: string): Promise<Record<string, any>> {
            if (!chatbotId) return undefined;

            const chatbot = await this.chatbotService.findOneById(chatbotId);
            const owned = chatbot?.accounts.toArray();

            if (!owned) throw chatbotNotFound();

            return this.databaseService.filterNin(field ?? 'id', owned);
        }
    }

    return mixin(MixinAccountChatbotFilterPipe);
}
