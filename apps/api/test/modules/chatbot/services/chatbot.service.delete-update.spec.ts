import { ChatbotCacheService } from '../../../../src/modules/ai-cache/services/chatbot-cache.service';
import { AccountRepository } from '../../../../src/modules/account/repository/repositories/account.repository';
import { ChatbotUpdateRequestDto } from '../../../../src/modules/chatbot/dtos/request/chatbot.update.request.dto';
import { ChatbotEntity } from '../../../../src/modules/chatbot/repository/entities/chatbot.entity';
import { ChatbotRepository } from '../../../../src/modules/chatbot/repository/repositories/chatbot.repository';
import { ChatbotService } from '../../../../src/modules/chatbot/services/chatbot.service';

const assign = jest.fn();

jest.mock('@mikro-orm/core', () => ({
    ...jest.requireActual('@mikro-orm/core'),
    wrap: () => ({ assign }),
}));

// A lightweight stand-in for a MikroORM Collection, the same as in the
// linkBatchAccounts spec: these tests cover the service's own decisions,
// not MikroORM's propagation.
const makeAccounts = (items: { id: string }[]) => ({
    isInitialized: jest.fn(() => true),
    init: jest.fn(),
    getItems: () => items,
    add: jest.fn(),
    removeAll: jest.fn(() => items.splice(0)),
});

describe('ChatbotService soft delete and update accounts', () => {
    let service: ChatbotService;
    let chatbotRepository: {
        save: jest.Mock;
        getEntityManager: jest.Mock;
    };

    beforeEach(() => {
        assign.mockReset();
        chatbotRepository = {
            save: jest.fn(entity => Promise.resolve(entity)),
            getEntityManager: jest.fn(),
        };
        service = new ChatbotService(
            { getReference: (_entity: unknown, id: string) => ({ id }) } as any,
            chatbotRepository as unknown as ChatbotRepository,
            { invalidate: jest.fn() } as unknown as ChatbotCacheService,
            {} as AccountRepository
        );
    });

    describe('softDelete', () => {
        it('unlinks every account of the chatbot in the same save', async () => {
            const accounts = makeAccounts([{ id: 'a1' }, { id: 'a2' }]);
            const chatbot = { id: 'bot-1', accounts } as unknown as ChatbotEntity;

            await service.softDelete(chatbot);

            expect(accounts.removeAll).toHaveBeenCalled();
            expect(chatbot.deletedAt).toBeInstanceOf(Date);
            expect(chatbotRepository.save).toHaveBeenCalledTimes(1);
            expect(accounts.removeAll.mock.invocationCallOrder[0]).toBeLessThan(
                chatbotRepository.save.mock.invocationCallOrder[0]
            );
        });

        it('initializes the accounts collection before unlinking', async () => {
            const accounts = makeAccounts([{ id: 'a1' }]);
            accounts.isInitialized.mockReturnValue(false);
            const chatbot = { id: 'bot-1', accounts } as unknown as ChatbotEntity;

            await service.softDelete(chatbot);

            expect(accounts.init).toHaveBeenCalled();
            expect(accounts.removeAll).toHaveBeenCalled();
        });
    });

    describe('update', () => {
        it('never touches the accounts collection for accounts: [], even when it is initialized', async () => {
            const accounts = makeAccounts([{ id: 'a1' }]);
            const chatbot = { id: 'bot-1', accounts } as unknown as ChatbotEntity;
            const dto = {
                name: 'Renamed',
                accounts: [],
            } as unknown as ChatbotUpdateRequestDto;

            await service.update(chatbot, dto);

            const [assigned] = assign.mock.calls[0];
            expect(assigned).not.toHaveProperty('accounts');
            expect(assigned).toEqual(
                expect.objectContaining({ name: 'Renamed' })
            );
            expect(accounts.removeAll).not.toHaveBeenCalled();
            expect(accounts.add).not.toHaveBeenCalled();
            expect(accounts.getItems()).toEqual([{ id: 'a1' }]);
        });
    });
});
