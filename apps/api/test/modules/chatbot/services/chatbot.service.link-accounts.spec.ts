import { AccountRepository } from '../../../../src/modules/account/repository/repositories/account.repository';
import { ChatbotCacheService } from '../../../../src/modules/ai-cache/services/chatbot-cache.service';
import { ChatbotEntity } from '../../../../src/modules/chatbot/repository/entities/chatbot.entity';
import { ChatbotRepository } from '../../../../src/modules/chatbot/repository/repositories/chatbot.repository';
import { ChatbotService } from '../../../../src/modules/chatbot/services/chatbot.service';

// `syncAccount` upserts accounts by externalId, so a client can be handed an
// id that already belongs to a different chatbot. `linkBatchAccounts` must
// never move it; this is the server-side half of the "no stealing" fix
// (fix round 2: the client-side pre-check was itself unreliable, since it
// only ever saw page 1 of the unlinked-accounts list).
describe('ChatbotService.linkBatchAccounts', () => {
    let service: ChatbotService;
    let accountRepository: { find: jest.Mock };
    let chatbotRepository: { save: jest.Mock };
    // The workspace assert's lookup; by default every id is in the workspace.
    let emFind: jest.Mock;

    // A lightweight stand-in for a MikroORM Collection: this is a unit test
    // of linkBatchAccounts' own linked/skipped decisions, not of MikroORM's
    // entity-type validation (which needs the ORM's metadata discovery to
    // have run, and isn't the thing under test here).
    const makeChatbot = (id: string, existing: { id: string }[] = []) => {
        const items = [...existing];
        return {
            id,
            workspace: { id: 'ws-1' },
            accounts: {
                isInitialized: () => true,
                init: jest.fn(),
                getItems: () => items,
                add: (item: { id: string }) => items.push(item),
            },
        } as unknown as ChatbotEntity;
    };

    beforeEach(() => {
        accountRepository = { find: jest.fn() };
        emFind = jest.fn(async (_entity, where: { id: { $in: string[] } }) =>
            where.id.$in.map(id => ({ id }))
        );
        chatbotRepository = {
            save: jest.fn(entity => Promise.resolve(entity)),
        };

        service = new ChatbotService(
            {
                getReference: (_entity: unknown, id: string) => ({ id }),
                find: emFind,
            } as any,
            chatbotRepository as unknown as ChatbotRepository,
            {} as ChatbotCacheService,
            accountRepository as unknown as AccountRepository
        );
    });

    it('links an account that belongs to no chatbot yet', async () => {
        const chatbot = makeChatbot('bot-1');
        accountRepository.find.mockResolvedValue([
            { id: 'a1', name: 'Free Account', chatbot: undefined },
        ]);

        const result = await service.linkBatchAccounts(chatbot, ['a1']);

        expect(result).toEqual({ linked: ['a1'], skipped: [] });
        expect(chatbot.accounts.getItems().map(a => a.id)).toEqual(['a1']);
        expect(chatbotRepository.save).toHaveBeenCalledWith(
            chatbot,
            undefined
        );
    });

    it('links an account already on this chatbot without duplicating it', async () => {
        const chatbot = makeChatbot('bot-1', [{ id: 'a3' }]);
        accountRepository.find.mockResolvedValue([
            { id: 'a3', name: 'Existing', chatbot: { id: 'bot-1' } },
        ]);

        const result = await service.linkBatchAccounts(chatbot, ['a3']);

        expect(result).toEqual({ linked: ['a3'], skipped: [] });
        expect(chatbot.accounts.getItems()).toHaveLength(1);
    });

    it('skips and reports an account already owned by another chatbot, and never moves it', async () => {
        const chatbot = makeChatbot('bot-1');
        accountRepository.find.mockResolvedValue([
            { id: 'a2', name: 'Taken Account', chatbot: { id: 'bot-other' } },
        ]);

        const result = await service.linkBatchAccounts(chatbot, ['a2']);

        expect(result).toEqual({
            linked: [],
            skipped: [{ id: 'a2', name: 'Taken Account' }],
        });
        expect(chatbot.accounts.getItems()).toHaveLength(0);
    });

    it('links the free ones and skips the taken ones in the same call', async () => {
        const chatbot = makeChatbot('bot-1');
        accountRepository.find.mockResolvedValue([
            { id: 'a1', name: 'Free Account', chatbot: undefined },
            { id: 'a2', name: 'Taken Account', chatbot: { id: 'bot-other' } },
        ]);

        const result = await service.linkBatchAccounts(chatbot, [
            'a1',
            'a2',
        ]);

        expect(result.linked).toEqual(['a1']);
        expect(result.skipped).toEqual([
            { id: 'a2', name: 'Taken Account' },
        ]);
    });

    it("refuses the whole call when an id is outside the chatbot's workspace", async () => {
        const chatbot = makeChatbot('bot-1');
        emFind.mockResolvedValue([{ id: 'a1' }]);

        await expect(
            service.linkBatchAccounts(chatbot, ['a1', 'foreign'])
        ).rejects.toMatchObject({
            response: { message: 'chatbot.error.accountsNotFound' },
        });
        expect(chatbotRepository.save).not.toHaveBeenCalled();
    });

    it("only queries accounts within the chatbot's own workspace", async () => {
        const chatbot = makeChatbot('bot-1');
        accountRepository.find.mockResolvedValue([]);

        await service.linkBatchAccounts(chatbot, ['a1']);

        expect(accountRepository.find).toHaveBeenCalledWith(
            expect.objectContaining({ workspace: 'ws-1' }),
            expect.anything()
        );
    });

    it('treats an account whose owner chatbot is soft-deleted as free and links it', async () => {
        const chatbot = makeChatbot('bot-1');
        accountRepository.find.mockResolvedValue([
            {
                id: 'a4',
                name: 'Orphaned Account',
                chatbot: { id: 'bot-deleted', deletedAt: new Date() },
            },
        ]);

        const result = await service.linkBatchAccounts(chatbot, ['a4']);

        expect(result).toEqual({ linked: ['a4'], skipped: [] });
        expect(chatbot.accounts.getItems().map(a => a.id)).toEqual(['a4']);
    });

    it("populates each account's owner chatbot so its deletedAt is known", async () => {
        const chatbot = makeChatbot('bot-1');
        accountRepository.find.mockResolvedValue([]);

        await service.linkBatchAccounts(chatbot, ['a1']);

        expect(accountRepository.find).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ populate: ['chatbot'] })
        );
    });
});
