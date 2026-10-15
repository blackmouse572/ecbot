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
import { ConflictException } from '@nestjs/common';
import { FollowupAdminController } from 'src/modules/platform/controllers/followup.admin.controller';

describe('FollowupAdminController', () => {
    const followupService = {
        findAllForAdmin: jest.fn(),
        getTotalForAdmin: jest.fn(),
        mapAdminList: jest.fn(),
        cancelById: jest.fn(),
    };
    const paginationService = { totalPage: jest.fn().mockReturnValue(2) };
    const controller = new FollowupAdminController(
        followupService as any,
        paginationService as any
    );

    beforeEach(() => jest.clearAllMocks());

    // Every row of every workspace comes back from here, so the admin-only
    // gate is the contract that matters most.
    it.each([
        ['list', ENUM_POLICY_SUBJECT.CHATBOT, [ENUM_POLICY_ACTION.READ]],
        [
            'cancel',
            ENUM_POLICY_SUBJECT.CHATBOT,
            [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
        ],
    ] as const)(
        '%s is admin-only and needs %s %s',
        (handler, subject, action) => {
            const method = FollowupAdminController.prototype[handler];
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

    it('lists follow-ups across workspaces with every filter, paged', async () => {
        const entities = [{ id: 'f1' }];
        const rows = [{ followupId: 'f1' }];
        followupService.findAllForAdmin.mockResolvedValue(entities);
        followupService.getTotalForAdmin.mockResolvedValue(21);
        followupService.mapAdminList.mockReturnValue(rows);
        const search = { $or: [{ reason: /giá/i }] };
        const find = {
            ...search,
            chatbot: { workspace: { $eq: 'w1' }, id: { $eq: 'c1' } },
            status: { $in: ['SCHEDULED'] },
        };

        const result = await controller.list(
            {
                _search: search,
                _limit: 20,
                _offset: 0,
                _order: { scheduledAt: 'desc' },
            } as any,
            { chatbot: { workspace: { $eq: 'w1' } } },
            { chatbot: { id: { $eq: 'c1' } } },
            { status: { $in: ['SCHEDULED'] } }
        );

        expect(followupService.findAllForAdmin).toHaveBeenCalledWith(find, {
            limit: 20,
            offset: 0,
            order: { scheduledAt: 'desc' },
        });
        expect(followupService.getTotalForAdmin).toHaveBeenCalledWith(find);
        expect(followupService.mapAdminList).toHaveBeenCalledWith(entities);
        expect(result).toEqual({
            _pagination: { total: 21, totalPage: 2 },
            data: rows,
        });
    });

    it('filters by workspace alone', async () => {
        followupService.findAllForAdmin.mockResolvedValue([]);
        followupService.getTotalForAdmin.mockResolvedValue(0);
        followupService.mapAdminList.mockReturnValue([]);

        await controller.list(
            { _limit: 20, _offset: 0, _order: {} } as any,
            { chatbot: { workspace: { $eq: 'w1' } } } as any,
            undefined,
            undefined
        );

        expect(followupService.findAllForAdmin).toHaveBeenCalledWith(
            { chatbot: { workspace: { $eq: 'w1' } } },
            expect.anything()
        );
    });

    it('cancels a pending follow-up', async () => {
        followupService.cancelById.mockResolvedValue(true);

        await expect(controller.cancel('f1')).resolves.toEqual({});
        expect(followupService.cancelById).toHaveBeenCalledWith('f1');
    });

    it('answers 409 when the follow-up is no longer pending', async () => {
        followupService.cancelById.mockResolvedValue(false);

        await expect(controller.cancel('f1')).rejects.toBeInstanceOf(
            ConflictException
        );
    });
});
