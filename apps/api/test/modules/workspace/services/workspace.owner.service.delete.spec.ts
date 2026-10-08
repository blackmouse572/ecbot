import { ConversationEntity } from '@app/modules/conversation/repository/entities/conversation.entity';
import { MessageEntity } from '@app/modules/conversation/repository/entities/message.entity';
import { KnowledgeItemChunkEntity } from '@app/modules/knowledge-base/repository/entities/knowledge-item-chunk.entity';
import { KnowledgeItemEntity } from '@app/modules/knowledge-base/repository/entities/knowledge-item.entity';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import { WorkspaceOwnerService } from '../../../../src/modules/workspace/services/workspace.owner.service';

// Deleting a workspace must also take its chat history and knowledge
// (including the embeddings) out of service.
describe('WorkspaceOwnerService.delete', () => {
    const session = {
        begin: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
        nativeUpdate: jest.fn().mockResolvedValue(1),
        nativeDelete: jest.fn().mockResolvedValue(1),
    };
    const em = { fork: jest.fn(() => session) };
    let service: WorkspaceOwnerService;

    beforeEach(() => {
        jest.clearAllMocks();
        const none = {} as any;
        service = new WorkspaceOwnerService(
            em as any,
            none,
            none,
            { get: jest.fn() } as any,
            none,
            none,
            none,
            none,
            none,
            none,
            none,
            none,
            undefined,
            none
        );
    });

    const updateFor = (entity: unknown) =>
        session.nativeUpdate.mock.calls.find(([e]) => e === entity);

    it('soft deletes conversations, messages and knowledge items of the workspace', async () => {
        await service.delete({ id: 'ws-1' } as any, 'u-1');

        expect(updateFor(ConversationEntity)?.[1]).toEqual({
            chatbot: { workspace: 'ws-1' },
        });
        expect(updateFor(MessageEntity)?.[1]).toEqual({
            conversation: { chatbot: { workspace: 'ws-1' } },
        });
        expect(updateFor(KnowledgeItemEntity)?.[1]).toEqual({
            knowledgeBase: { workspace: 'ws-1' },
        });
        expect(updateFor(MessageEntity)?.[2]).toMatchObject({
            deleted: true,
            deletedBy: 'u-1',
        });
    });

    it('hard deletes the knowledge chunks, which have no soft delete columns', async () => {
        await service.delete({ id: 'ws-1' } as any, 'u-1');

        expect(session.nativeDelete).toHaveBeenCalledWith(
            KnowledgeItemChunkEntity,
            { knowledgeBaseItem: { knowledgeBase: { workspace: 'ws-1' } } }
        );
    });

    it('still deletes the workspace row last and commits', async () => {
        await service.delete({ id: 'ws-1' } as any, 'u-1');

        const last = session.nativeUpdate.mock.calls.at(-1);
        expect(last?.[0]).toBe(WorkspaceEntity);
        expect(session.commit).toHaveBeenCalled();
    });
});
