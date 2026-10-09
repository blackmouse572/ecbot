import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';
import { UserUserController } from '../../../src/modules/user/controllers/user.user.controller';

// Account deletion: soft delete + anonymise the row, revoke sessions, remove
// the uploaded photo, and keep the audit trail free of the deleted name.
describe('UserUserController.delete', () => {
    const session = {
        begin: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
    };
    const em = { fork: jest.fn(() => session) };
    const userService = {
        softDelete: jest.fn(),
        anonymize: jest.fn(),
    };
    const activityService = { createByUser: jest.fn() };
    const sessionService = {
        updateManyRevokeByUser: jest.fn(),
        anonymizeByUser: jest.fn(),
    };
    const awsS3Service = { deleteDir: jest.fn().mockResolvedValue(undefined) };
    let controller: UserUserController;

    const user = { id: 'u-1', name: 'Nguyen Van A', email: 'a@b.co' } as any;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new UserUserController(
            em as any,
            userService as any,
            activityService as any,
            {} as any,
            sessionService as any,
            {} as any,
            awsS3Service as any
        );
    });

    it('soft deletes, anonymises and revokes sessions in one transaction', async () => {
        await controller.delete(user);

        expect(userService.softDelete).toHaveBeenCalledWith(user, {
            em: session,
            actionBy: 'u-1',
        });
        expect(userService.anonymize).toHaveBeenCalledWith(user, {
            em: session,
            actionBy: 'u-1',
        });
        expect(sessionService.updateManyRevokeByUser).toHaveBeenCalledWith(
            'u-1',
            { em: session }
        );
        expect(sessionService.anonymizeByUser).toHaveBeenCalledWith('u-1', {
            em: session,
        });
        expect(session.commit).toHaveBeenCalled();
    });

    it('does not copy the name into the audit row', async () => {
        await controller.delete(user);

        const [, data] = activityService.createByUser.mock.calls[0];
        expect(data.action).toBe(ENUM_ACTIVITY_ACTION.DELETE);
        expect(data.metadata).toEqual({ id: 'u-1' });
    });

    it('removes the uploaded photos from S3 after commit', async () => {
        await controller.delete(user);

        expect(awsS3Service.deleteDir).toHaveBeenCalledWith('user/u-1/');
    });

    it('rolls back and skips S3 when the database step fails', async () => {
        userService.anonymize.mockRejectedValueOnce(new Error('db'));

        await expect(controller.delete(user)).rejects.toBeDefined();
        expect(session.rollback).toHaveBeenCalled();
        expect(awsS3Service.deleteDir).not.toHaveBeenCalled();
    });
});
