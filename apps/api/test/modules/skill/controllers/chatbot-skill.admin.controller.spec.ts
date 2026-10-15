import { GUARDS_METADATA } from '@nestjs/common/constants';
import {
    POLICY_ABILITY_META_KEY,
    POLICY_ROLE_META_KEY,
} from 'src/modules/policy/constants/policy.constant';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from 'src/modules/policy/enums/policy.enum';
import { PolicyAbilityGuard } from 'src/modules/policy/guards/policy.ability.guard';
import { PolicyRoleGuard } from 'src/modules/policy/guards/policy.role.guard';
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

    // Every row of every workspace comes back from here, so the admin-only
    // gate is the contract that matters most.
    it.each([
        ['list', ENUM_POLICY_SUBJECT.SKILL, [ENUM_POLICY_ACTION.READ]],
    ] as const)(
        '%s is admin-only and needs %s %s',
        (handler, subject, action) => {
            const method = ChatbotSkillAdminController.prototype[handler];
            expect(Reflect.getMetadata(GUARDS_METADATA, method)).toEqual(
                expect.arrayContaining([PolicyRoleGuard, PolicyAbilityGuard])
            );
            expect(Reflect.getMetadata(POLICY_ROLE_META_KEY, method)).toEqual([
                ENUM_POLICY_ROLE_TYPE.ADMIN,
            ]);
            expect(
                Reflect.getMetadata(POLICY_ABILITY_META_KEY, method)
            ).toEqual([{ subject, action }]);
        }
    );

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
