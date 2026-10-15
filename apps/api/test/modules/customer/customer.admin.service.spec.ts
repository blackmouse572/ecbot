import { ENUM_ACCOUNT_TYPE } from 'src/modules/account/enums/account.enum';
import { CustomerAdminService } from 'src/modules/customer/services/customer.admin.service';

describe('CustomerAdminService', () => {
    const workspace = {
        id: 'w1',
        name: 'Tiệm Bánh Mây',
        slug: 'tiem-banh-may',
        invitationCode: 'secret-code',
        owner: { id: 'u1', password: 'hash' },
    };
    const customer = (id: string, extra: Record<string, any> = {}) => ({
        id,
        name: `Lan ${id}`,
        phone: '0901234567',
        email: 'lan@example.com',
        language: 'vi',
        notes: 'Thích bánh ít ngọt',
        profileSummary: 'Khách quen',
        metadata: { secretKey: 'x' },
        workspace,
        createdAt: new Date('2026-10-01T00:00:00Z'),
        updatedAt: new Date('2026-10-02T00:00:00Z'),
        ...extra,
    });
    const contactPoint = (
        id: string,
        customerId: string,
        platform: ENUM_ACCOUNT_TYPE,
        extra: Record<string, any> = {}
    ) => ({
        id,
        customer: { id: customerId },
        workspace,
        platform,
        externalSenderId: `psid-${id}`,
        displaySenderName: `Sender ${id}`,
        senderAvatar: `https://cdn.example.com/${id}.png`,
        createdAt: new Date('2026-10-01T01:00:00Z'),
        ...extra,
    });
    const assignment = (customerId: string, tagId: string, name: string) => ({
        id: `${customerId}-${tagId}`,
        customer: { id: customerId },
        tag: {
            id: tagId,
            name,
            emoji: '⭐',
            description: 'secret description',
            triggersHandoff: true,
            workspace,
        },
    });

    const customerRepository = {
        find: jest.fn(),
        getTotal: jest.fn(),
        findOne: jest.fn(),
    };
    const contactPointRepository = { find: jest.fn() };
    const tagAssignmentRepository = { find: jest.fn() };
    const customerService = { summarizeConversations: jest.fn() };
    const service = new CustomerAdminService(
        customerRepository as any,
        contactPointRepository as any,
        tagAssignmentRepository as any,
        customerService as any
    );

    beforeEach(() => jest.clearAllMocks());

    it('lists customers with workspace, channels, avatar and tags, batched for the whole page', async () => {
        customerRepository.find.mockResolvedValue([
            customer('c1'),
            customer('c2', { name: null }),
        ]);
        contactPointRepository.find.mockResolvedValue([
            contactPoint('p1', 'c1', ENUM_ACCOUNT_TYPE.ZALO_PAGE),
            contactPoint('p2', 'c1', ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE),
            contactPoint('p3', 'c1', ENUM_ACCOUNT_TYPE.ZALO_PAGE),
            contactPoint('p4', 'c2', ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE, {
                senderAvatar: null,
            }),
        ]);
        tagAssignmentRepository.find.mockResolvedValue([
            assignment('c1', 't2', 'VIP'),
            assignment('c1', 't1', 'Mới'),
        ]);

        const rows = await service.findAll(
            { workspace: { $eq: 'w1' } },
            { limit: 20, offset: 0 }
        );

        expect(customerRepository.find).toHaveBeenCalledWith(
            {
                deletedAt: null,
                mergedIntoCustomerId: null,
                workspace: { $eq: 'w1' },
            },
            { limit: 20, offset: 0, populate: ['workspace'] }
        );
        expect(contactPointRepository.find).toHaveBeenCalledTimes(1);
        expect(contactPointRepository.find).toHaveBeenCalledWith(
            { customer: { $in: ['c1', 'c2'] }, deletedAt: null },
            { orderBy: { createdAt: 'ASC' } }
        );
        expect(tagAssignmentRepository.find).toHaveBeenCalledTimes(1);
        expect(tagAssignmentRepository.find).toHaveBeenCalledWith(
            {
                customer: { $in: ['c1', 'c2'] },
                deletedAt: null,
                tag: { deletedAt: null },
            },
            { populate: ['tag'] }
        );
        expect(rows[0]).toEqual({
            id: 'c1',
            name: 'Lan c1',
            displayName: 'Lan c1',
            phone: '0901234567',
            email: 'lan@example.com',
            avatar: 'https://cdn.example.com/p1.png',
            workspace: {
                id: 'w1',
                name: 'Tiệm Bánh Mây',
                slug: 'tiem-banh-may',
            },
            contactPointCount: 3,
            channels: [
                ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
                ENUM_ACCOUNT_TYPE.ZALO_PAGE,
            ],
            tags: [
                { id: 't1', name: 'Mới', emoji: '⭐' },
                { id: 't2', name: 'VIP', emoji: '⭐' },
            ],
            createdAt: new Date('2026-10-01T00:00:00Z'),
            updatedAt: new Date('2026-10-02T00:00:00Z'),
        });
        expect(rows[1]).toMatchObject({
            id: 'c2',
            displayName: 'Sender p4',
            contactPointCount: 1,
            channels: [ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE],
            tags: [],
        });
        expect(rows[1].avatar).toBeUndefined();
        expect(rows[0]).not.toHaveProperty('metadata');
        expect(rows[0]).not.toHaveProperty('notes');
    });

    it('skips the batch lookups for an empty page', async () => {
        customerRepository.find.mockResolvedValue([]);

        await expect(service.findAll({}, { limit: 20 })).resolves.toEqual([]);
        expect(contactPointRepository.find).not.toHaveBeenCalled();
        expect(tagAssignmentRepository.find).not.toHaveBeenCalled();
    });

    it('turns the tag and channel filters into conditions on live assignments and contact points', async () => {
        customerRepository.find.mockResolvedValue([]);
        customerRepository.getTotal.mockResolvedValue(0);
        const find = {
            workspace: { $eq: 'w1' },
            tag: { $eq: 't1' },
            platform: { $in: [ENUM_ACCOUNT_TYPE.ZALO_PAGE] },
        };
        const where = {
            deletedAt: null,
            mergedIntoCustomerId: null,
            workspace: { $eq: 'w1' },
            tagAssignments: {
                $some: { tag: { $eq: 't1' }, deletedAt: null },
            },
            contactPoints: {
                $some: {
                    platform: { $in: [ENUM_ACCOUNT_TYPE.ZALO_PAGE] },
                    deletedAt: null,
                },
            },
        };

        await service.findAll(find, { limit: 10 });
        await service.getTotal(find);

        expect(customerRepository.find).toHaveBeenCalledWith(where, {
            limit: 10,
            populate: ['workspace'],
        });
        expect(customerRepository.getTotal).toHaveBeenCalledWith(where);
    });

    it('returns one customer with contact points, tags and conversation count, and no secrets', async () => {
        customerRepository.findOne.mockResolvedValue(
            customer('c1', { mergedIntoCustomerId: null })
        );
        contactPointRepository.find.mockResolvedValue([
            contactPoint('p1', 'c1', ENUM_ACCOUNT_TYPE.ZALO_PAGE),
        ]);
        tagAssignmentRepository.find.mockResolvedValue([
            assignment('c1', 't1', 'VIP'),
        ]);
        customerService.summarizeConversations.mockResolvedValue(
            new Map([['c1', { conversationCount: 4, channels: [] }]])
        );

        const data = await service.findOneById('c1');

        expect(customerRepository.findOne).toHaveBeenCalledWith(
            { id: 'c1', deletedAt: null },
            { populate: ['workspace'] }
        );
        expect(customerService.summarizeConversations).toHaveBeenCalledWith(
            ['c1'],
            'w1'
        );
        expect(data).toMatchObject({
            id: 'c1',
            language: 'vi',
            notes: 'Thích bánh ít ngọt',
            profileSummary: 'Khách quen',
            conversationCount: 4,
            contactPointCount: 1,
            channels: [ENUM_ACCOUNT_TYPE.ZALO_PAGE],
            tags: [{ id: 't1', name: 'VIP', emoji: '⭐' }],
            contactPoints: [
                {
                    id: 'p1',
                    platform: ENUM_ACCOUNT_TYPE.ZALO_PAGE,
                    displayName: 'Sender p1',
                    avatar: 'https://cdn.example.com/p1.png',
                    createdAt: new Date('2026-10-01T01:00:00Z'),
                },
            ],
        });
        expect(data.contactPoints[0]).not.toHaveProperty('externalSenderId');
        expect(data.tags[0]).not.toHaveProperty('description');
        expect(data).not.toHaveProperty('metadata');
        expect(data.workspace).not.toHaveProperty('invitationCode');
        expect(data.workspace).not.toHaveProperty('owner');
        expect(JSON.stringify(data)).not.toMatch(/secret|hash|psid/);
    });

    it('counts zero conversations for a customer with none', async () => {
        customerRepository.findOne.mockResolvedValue(customer('c1'));
        contactPointRepository.find.mockResolvedValue([]);
        tagAssignmentRepository.find.mockResolvedValue([]);
        customerService.summarizeConversations.mockResolvedValue(new Map());

        const data = await service.findOneById('c1');

        expect(data).toMatchObject({
            conversationCount: 0,
            contactPointCount: 0,
            channels: [],
            contactPoints: [],
            tags: [],
        });
    });

    it('returns null for a missing or deleted customer', async () => {
        customerRepository.findOne.mockResolvedValue(null);

        await expect(service.findOneById('nope')).resolves.toBeNull();
        expect(contactPointRepository.find).not.toHaveBeenCalled();
    });
});
