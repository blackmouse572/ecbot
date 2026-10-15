import { CustomerTagAdminService } from 'src/modules/customer/services/customer-tag.admin.service';

describe('CustomerTagAdminService', () => {
    const workspace = {
        id: 'w1',
        name: 'Tiệm Bánh Mây',
        slug: 'tiem-banh-may',
        invitationCode: 'secret-code',
        owner: { id: 'u1', password: 'hash' },
    };
    const tag = (id: string, extra: Record<string, any> = {}) => ({
        id,
        name: `Tag ${id}`,
        emoji: '⭐',
        description: 'Khách mua trên 5 lần',
        triggersHandoff: false,
        notifiesTeam: true,
        workspace,
        createdAt: new Date('2026-10-01T00:00:00Z'),
        updatedAt: new Date('2026-10-02T00:00:00Z'),
        ...extra,
    });

    const tagRepository = { find: jest.fn(), getTotal: jest.fn() };
    const tagAssignmentRepository = { countCustomersByTags: jest.fn() };
    const service = new CustomerTagAdminService(
        tagRepository as any,
        tagAssignmentRepository as any
    );

    beforeEach(() => jest.clearAllMocks());

    it('lists tags with workspace and batched customer counts, without workspace secrets', async () => {
        tagRepository.find.mockResolvedValue([tag('t1'), tag('t2')]);
        tagAssignmentRepository.countCustomersByTags.mockResolvedValue(
            new Map([['t1', 7]])
        );

        const rows = await service.findAll(
            { workspace: { $eq: 'w1' } },
            { limit: 20, offset: 0 }
        );

        expect(tagRepository.find).toHaveBeenCalledWith(
            { deletedAt: null, workspace: { $eq: 'w1' } },
            { limit: 20, offset: 0, populate: ['workspace'] }
        );
        expect(
            tagAssignmentRepository.countCustomersByTags
        ).toHaveBeenCalledTimes(1);
        expect(
            tagAssignmentRepository.countCustomersByTags
        ).toHaveBeenCalledWith(['t1', 't2']);
        expect(rows[0]).toEqual({
            id: 't1',
            name: 'Tag t1',
            emoji: '⭐',
            description: 'Khách mua trên 5 lần',
            triggersHandoff: false,
            notifiesTeam: true,
            customerCount: 7,
            workspace: {
                id: 'w1',
                name: 'Tiệm Bánh Mây',
                slug: 'tiem-banh-may',
            },
            createdAt: new Date('2026-10-01T00:00:00Z'),
            updatedAt: new Date('2026-10-02T00:00:00Z'),
        });
        expect(rows[1]).toMatchObject({ id: 't2', customerCount: 0 });
        expect(JSON.stringify(rows)).not.toMatch(/secret|hash/);
    });

    it('counts live tags only', async () => {
        tagRepository.getTotal.mockResolvedValue(3);

        await expect(service.getTotal({})).resolves.toBe(3);
        expect(tagRepository.getTotal).toHaveBeenCalledWith({
            deletedAt: null,
        });
    });
});
