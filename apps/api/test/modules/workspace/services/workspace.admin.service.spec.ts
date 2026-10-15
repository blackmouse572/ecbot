import { WorkspaceAdminService } from 'src/modules/workspace/services/workspace.admin.service';

describe('WorkspaceAdminService', () => {
    const owner = { id: 'u1', name: 'Lan', email: 'lan@shop.vn' };
    const workspace = (id: string) => ({
        id,
        name: `Shop ${id}`,
        slug: `shop-${id}`,
        owner,
        invitationCode: 'secret-code',
        tokenCreditBalance: 5000,
        createdAt: new Date('2026-10-01T00:00:00Z'),
        updatedAt: new Date('2026-10-02T00:00:00Z'),
    });

    const repository = {
        find: jest.fn(),
        getTotal: jest.fn(),
        findOne: jest.fn(),
        countMembersAndChatbots: jest.fn(),
    };
    const service = new WorkspaceAdminService(repository as any);

    beforeEach(() => jest.clearAllMocks());

    it('lists workspaces with owner, counts and credit balance, without the invitation code', async () => {
        repository.find.mockResolvedValue([workspace('w1'), workspace('w2')]);
        repository.countMembersAndChatbots.mockResolvedValue(
            new Map([['w1', { memberCount: 3, chatbotCount: 2 }]])
        );

        const rows = await service.findAll(
            { name: 'shop' },
            { limit: 20, offset: 0 }
        );

        expect(repository.find).toHaveBeenCalledWith(
            { deleted: false, name: 'shop' },
            { limit: 20, offset: 0, populate: ['owner'] }
        );
        expect(repository.countMembersAndChatbots).toHaveBeenCalledWith([
            'w1',
            'w2',
        ]);
        expect(rows[0]).toMatchObject({
            id: 'w1',
            name: 'Shop w1',
            owner: { id: 'u1', email: 'lan@shop.vn' },
            memberCount: 3,
            chatbotCount: 2,
            tokenCreditBalance: 5000,
        });
        expect(rows[1]).toMatchObject({ memberCount: 0, chatbotCount: 0 });
        expect(rows[0]).not.toHaveProperty('invitationCode');
    });

    it('counts only workspaces that are not deleted', async () => {
        repository.getTotal.mockResolvedValue(7);

        await expect(service.getTotal({ slug: 'a' })).resolves.toBe(7);
        expect(repository.getTotal).toHaveBeenCalledWith({
            deleted: false,
            slug: 'a',
        });
    });

    it('returns one workspace with its counts, or null when missing', async () => {
        repository.findOne.mockResolvedValueOnce(workspace('w1'));
        repository.countMembersAndChatbots.mockResolvedValue(
            new Map([['w1', { memberCount: 1, chatbotCount: 4 }]])
        );

        await expect(service.findOneById('w1')).resolves.toMatchObject({
            id: 'w1',
            memberCount: 1,
            chatbotCount: 4,
        });
        expect(repository.findOne).toHaveBeenCalledWith(
            { id: 'w1', deleted: false },
            { populate: ['owner'] }
        );

        repository.findOne.mockResolvedValueOnce(null);
        await expect(service.findOneById('nope')).resolves.toBeNull();
    });
});
