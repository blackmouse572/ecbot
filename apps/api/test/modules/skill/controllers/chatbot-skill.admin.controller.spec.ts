import { ChatbotSkillAdminController } from 'src/modules/skill/controllers/chatbot-skill.admin.controller';

describe('ChatbotSkillAdminController', () => {
    const chatbotSkillService = {
        findAllForAdmin: jest.fn(),
        getTotalForAdmin: jest.fn(),
        mapAdminList: jest.fn(),
    };
    const paginationService = { totalPage: jest.fn().mockReturnValue(2) };
    const controller = new ChatbotSkillAdminController(
        chatbotSkillService as any,
        paginationService as any
    );

    beforeEach(() => jest.clearAllMocks());

    it('lists links with every filter, the two chatbot filters merged', async () => {
        const entities = [{ id: 'cs-1' }];
        const rows = [{ id: 'cs-1' }];
        chatbotSkillService.findAllForAdmin.mockResolvedValue(entities);
        chatbotSkillService.getTotalForAdmin.mockResolvedValue(21);
        chatbotSkillService.mapAdminList.mockReturnValue(rows);
        const search = { $or: [{ skill: { name: /refund/i } }] };
        const find = {
            ...search,
            chatbot: { workspace: { $eq: 'w1' }, id: { $eq: 'cb-1' } },
            skill: { id: { $eq: 's-1' } },
            enabled: { $in: [false] },
        };

        const result = await controller.list(
            {
                _search: search,
                _limit: 20,
                _offset: 0,
                _order: { createdAt: 'desc' },
            } as any,
            { chatbot: { workspace: { $eq: 'w1' } } },
            { chatbot: { id: { $eq: 'cb-1' } } },
            { skill: { id: { $eq: 's-1' } } },
            { enabled: { $in: [false] } }
        );

        expect(chatbotSkillService.findAllForAdmin).toHaveBeenCalledWith(find, {
            limit: 20,
            offset: 0,
            order: { createdAt: 'desc' },
        });
        expect(chatbotSkillService.getTotalForAdmin).toHaveBeenCalledWith(find);
        expect(chatbotSkillService.mapAdminList).toHaveBeenCalledWith(entities);
        expect(result).toEqual({
            _pagination: { total: 21, totalPage: 2 },
            data: rows,
        });
    });
});
