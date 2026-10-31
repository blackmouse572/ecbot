import { UnprocessableEntityException } from '@nestjs/common';
import { ENUM_WORKSPACE_STATUS_CODE_ERROR } from '../../../../src/modules/workspace/enums/workspace.status-code.enum';
import { WorkspaceSeatQuotaService } from '../../../../src/modules/workspace/services/workspace-seat-quota.service';

describe('WorkspaceSeatQuotaService', () => {
    const members = { countSeatsByWorkspace: jest.fn() };
    const invitations = { countPendingByWorkspace: jest.fn() };
    const seatLimit = { getSeatLimit: jest.fn() };

    const build = (withSeam = true) =>
        new WorkspaceSeatQuotaService(
            members as any,
            invitations as any,
            withSeam ? (seatLimit as any) : undefined
        );

    beforeEach(() => jest.clearAllMocks());

    const refusal = async (p: Promise<void>) => {
        const err = await p.catch(e => e);
        expect(err).toBeInstanceOf(UnprocessableEntityException);
        expect(err.getResponse()).toMatchObject({
            statusCode: ENUM_WORKSPACE_STATUS_CODE_ERROR.SEAT_LIMIT_EXCEEDED,
            message: 'workspace.error.seatLimitExceeded',
        });
    };

    it('refuses an invite once members plus pending invitations fill the plan', async () => {
        seatLimit.getSeatLimit.mockResolvedValue(3);
        members.countSeatsByWorkspace.mockResolvedValue(2);
        invitations.countPendingByWorkspace.mockResolvedValue(1);

        await refusal(build().assertCanInvite('ws-1'));
    });

    it('allows an invite while a seat is free', async () => {
        seatLimit.getSeatLimit.mockResolvedValue(3);
        members.countSeatsByWorkspace.mockResolvedValue(1);
        invitations.countPendingByWorkspace.mockResolvedValue(1);

        await expect(build().assertCanInvite('ws-1')).resolves.toBeUndefined();
        // The plan is read once per invite.
        expect(seatLimit.getSeatLimit).toHaveBeenCalledTimes(1);
    });

    it('refuses a join when members already fill the plan (an invite from before a downgrade)', async () => {
        seatLimit.getSeatLimit.mockResolvedValue(2);
        members.countSeatsByWorkspace.mockResolvedValue(2);

        await refusal(build().assertCanAddMember('ws-1'));
    });

    it('lets the invited person join into the seat their invitation reserved', async () => {
        seatLimit.getSeatLimit.mockResolvedValue(2);
        members.countSeatsByWorkspace.mockResolvedValue(1);

        await expect(
            build().assertCanAddMember('ws-1')
        ).resolves.toBeUndefined();
        expect(invitations.countPendingByWorkspace).not.toHaveBeenCalled();
    });

    it('never limits on an unlimited plan or without the seam', async () => {
        seatLimit.getSeatLimit.mockResolvedValue(null);
        await build().assertCanInvite('ws-1');
        await build(false).assertCanInvite('ws-1');
        await build(false).assertCanAddMember('ws-1');
        expect(members.countSeatsByWorkspace).not.toHaveBeenCalled();
    });

    it('reports usage with the limit', async () => {
        seatLimit.getSeatLimit.mockResolvedValue(10);
        members.countSeatsByWorkspace.mockResolvedValue(4);
        invitations.countPendingByWorkspace.mockResolvedValue(2);

        await expect(build().getUsage('ws-1')).resolves.toEqual({
            members: 4,
            pendingInvitations: 2,
            limit: 10,
        });
    });
});
