import { ChatbotSkillService } from 'src/modules/skill/services/chatbot-skill.service';
import { ENUM_SKILL_STATUS } from 'src/modules/skill/enums/skill-status.enum';

describe('ChatbotSkillService admin', () => {
    const repo = {
        findAllForAdmin: jest.fn(),
        countForAdmin: jest.fn(),
    };
    const service = new ChatbotSkillService(
        repo as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any
    );

    beforeEach(() => jest.clearAllMocks());

    it('lists links of live agents and skills in every workspace', async () => {
        repo.findAllForAdmin.mockResolvedValue([]);
        repo.countForAdmin.mockResolvedValue(3);
        const find = { enabled: { $in: [true] } };

        await service.findAllForAdmin(find, { limit: 20, offset: 0 });
        await expect(service.getTotalForAdmin(find)).resolves.toBe(3);

        const where = {
            deleted: false,
            chatbot: { deleted: false },
            skill: { deleted: false },
            enabled: { $in: [true] },
        };
        expect(repo.findAllForAdmin).toHaveBeenCalledWith(where, {
            limit: 20,
            offset: 0,
        });
        expect(repo.countForAdmin).toHaveBeenCalledWith(where);
    });

    it('keeps a chatbot filter next to the live-agent guard', async () => {
        repo.findAllForAdmin.mockResolvedValue([]);

        await service.findAllForAdmin(
            { chatbot: { workspace: { $eq: 'w1' } } },
            {}
        );

        expect(repo.findAllForAdmin).toHaveBeenCalledWith(
            expect.objectContaining({
                chatbot: { deleted: false, workspace: { $eq: 'w1' } },
            }),
            {}
        );
    });

    it('maps a link to its agent, skill and workspace, nothing more', () => {
        const createdAt = new Date('2026-10-15T00:00:00Z');
        const [row] = service.mapAdminList([
            {
                id: 'cs-1',
                enabled: true,
                createdAt,
                chatbot: {
                    id: 'cb-1',
                    name: 'Lotus bot',
                    avatar: null,
                    systemPrompt: 'secret prompt',
                    workspace: {
                        id: 'w1',
                        name: 'Lotus Spa',
                        slug: 'lotus',
                        invitationCode: 'secret',
                    },
                },
                skill: {
                    id: 's-1',
                    name: 'Refund policy',
                    slug: 'refund-policy',
                    status: ENUM_SKILL_STATUS.ACTIVE,
                    workspace: null,
                    s3: { key: 'secret' },
                },
            },
        ] as any);

        expect(row).toEqual({
            id: 'cs-1',
            enabled: true,
            createdAt,
            chatbot: { id: 'cb-1', name: 'Lotus bot', avatar: null },
            skill: {
                id: 's-1',
                name: 'Refund policy',
                slug: 'refund-policy',
                status: ENUM_SKILL_STATUS.ACTIVE,
                isBuiltin: true,
            },
            workspace: { id: 'w1', name: 'Lotus Spa', slug: 'lotus' },
        });
    });
});
