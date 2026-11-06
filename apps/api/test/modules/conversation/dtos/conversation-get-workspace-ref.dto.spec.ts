import { plainToInstance } from 'class-transformer';
import { AccountGetResponseDto } from '@app/modules/account/dtos/response/account.get.response.dto';
import { ChatbotListResponseDto } from '@app/modules/chatbot/dtos/response/chatbot.list.response.dto';
import { ChatbotEntity } from '@app/modules/chatbot/repository/entities/chatbot.entity';
import { ConversationGetResponseDto } from '@app/modules/conversation/dtos/response/conversation.get.response.dto';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';

const REAL_WORKSPACE_ID = '77e45102-81e6-4573-bef8-8adca7bd2fbd';

/** What MikroORM hands back for an unpopulated ManyToOne: an entity holding only its id. */
function workspaceReference(): WorkspaceEntity {
    const workspace = new WorkspaceEntity();
    workspace.id = REAL_WORKSPACE_ID;
    return workspace;
}

/** Every workspace id anywhere in the serialized response. */
function workspaceIds(value: unknown): string[] {
    const ids: string[] = [];
    JSON.stringify(value, (key, nested) => {
        if (key === 'workspace') {
            ids.push(typeof nested === 'string' ? nested : nested?.id);
        }
        return nested;
    });
    return ids;
}

// QA gate D4: a conversation list carried two made-up workspaces (fresh ids,
// createdAt = response time). class-transformer turned each workspace
// reference into a new WorkspaceEntity, whose defaults filled a random id.
describe('nested workspace in conversation responses', () => {
    const conversation = () => {
        const chatbot = new ChatbotEntity();
        chatbot.id = 'chatbot-1';
        chatbot.workspace = workspaceReference();

        return {
            id: 'conversation-1',
            createdAt: new Date(),
            chatbot,
            account: { id: 'account-1', workspace: workspaceReference() },
        };
    };

    it('carries only the real workspace id', () => {
        const dto = plainToInstance(
            ConversationGetResponseDto,
            conversation(),
            {
                excludeExtraneousValues: true,
            }
        );

        const ids = workspaceIds(dto);
        expect(ids).toEqual([REAL_WORKSPACE_ID, REAL_WORKSPACE_ID]);
        expect(dto.chatbot?.workspace).toBe(REAL_WORKSPACE_ID);
        expect(dto.account?.workspace).toBe(REAL_WORKSPACE_ID);
    });

    it.each([
        ['chatbot', ChatbotListResponseDto],
        ['account', AccountGetResponseDto],
    ])('keeps a %s workspace that is already an id', (_, Dto) => {
        const dto = plainToInstance(
            Dto as typeof AccountGetResponseDto,
            { id: 'x', workspace: REAL_WORKSPACE_ID },
            { excludeExtraneousValues: true }
        );

        expect(dto.workspace).toBe(REAL_WORKSPACE_ID);
    });
});
