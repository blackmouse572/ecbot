import { SkillAdminController } from 'src/modules/skill/controllers/skill.admin.controller';

describe('SkillAdminController list', () => {
    const skillService = {
        findAllSystem: jest.fn().mockResolvedValue([]),
        getTotalSystem: jest.fn().mockResolvedValue(0),
        findAllBuiltin: jest.fn().mockResolvedValue([]),
        getTotalBuiltin: jest.fn().mockResolvedValue(0),
        mapList: jest.fn().mockReturnValue([]),
    };
    const paginationService = { totalPage: jest.fn().mockReturnValue(1) };
    const controller = new SkillAdminController(
        skillService as any,
        paginationService as any,
        {} as any
    );
    const paging = { _limit: 20, _offset: 0, _order: {} } as any;

    beforeEach(() => jest.clearAllMocks());

    it('lists builtin templates by default', async () => {
        await controller.list(paging);

        expect(skillService.findAllBuiltin).toHaveBeenCalled();
        expect(skillService.findAllSystem).not.toHaveBeenCalled();
    });

    it('searches every skill when filtered by workspace or agent', async () => {
        const workspace = { workspace: 'w1' };
        const chatbot = { chatbotLinks: { chatbot: 'c1' } };

        await controller.list(paging, undefined, workspace, chatbot);

        expect(skillService.findAllSystem).toHaveBeenCalledWith(
            { ...workspace, ...chatbot },
            { limit: 20, offset: 0, order: {} }
        );
        expect(skillService.getTotalSystem).toHaveBeenCalledWith({
            ...workspace,
            ...chatbot,
        });
        expect(skillService.findAllBuiltin).not.toHaveBeenCalled();
    });
});
