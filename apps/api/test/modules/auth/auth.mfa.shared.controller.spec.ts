import { Test } from '@nestjs/testing';
import { AuthMfaSharedController } from '@app/modules/auth/controllers/auth.mfa.shared.controller';
import { AuthService } from '@app/modules/auth/services/auth.service';
import { MfaService } from '@app/modules/auth/services/mfa.service';
import { ActivityService } from '@app/modules/activity/services/activity.service';
import { UserService } from '@app/modules/user/services/user.service';
import { ENUM_AUTH_STATUS_CODE_ERROR } from '@app/modules/auth/enums/auth.status-code.enum';
import { ENUM_USER_STATUS_CODE_ERROR } from '@app/modules/user/enums/user.status-code.enum';

describe('AuthMfaSharedController', () => {
    let controller: AuthMfaSharedController;

    const authService = {
        getPasswordAttempt: jest.fn(() => true),
        getPasswordMaxAttempt: jest.fn(() => 5),
        validateUser: jest.fn(),
    };
    const mfaService = {
        setup: jest.fn(),
        enable: jest.fn(),
        disable: jest.fn(),
        verify: jest.fn(),
        invalidCodeError: jest.fn(
            () => new Error('auth.error.mfaCodeInvalid') as any
        ),
    };
    const userService = {
        increasePasswordAttempt: jest.fn(),
        resetPasswordAttempt: jest.fn(),
    };
    const activityService = { createByUser: jest.fn() };

    let user: any;

    beforeEach(async () => {
        jest.clearAllMocks();
        user = {
            id: 'u1',
            password: 'hash',
            passwordAttempt: 0,
            mfaEnabled: true,
        };
        const module = await Test.createTestingModule({
            controllers: [AuthMfaSharedController],
            providers: [
                { provide: AuthService, useValue: authService },
                { provide: MfaService, useValue: mfaService },
                { provide: UserService, useValue: userService },
                { provide: ActivityService, useValue: activityService },
            ],
        }).compile();
        controller = module.get(AuthMfaSharedController);
    });

    it('disables MFA with the right password and a valid code', async () => {
        authService.validateUser.mockResolvedValue(true);
        mfaService.verify.mockResolvedValue(true);

        await controller.disable(user, { password: 'pass', code: '123456' });

        expect(mfaService.disable).toHaveBeenCalledWith(user);
        expect(activityService.createByUser).toHaveBeenCalled();
    });

    it('refuses a wrong password, counting the attempt', async () => {
        authService.validateUser.mockResolvedValue(false);

        await expect(
            controller.disable(user, { password: 'bad', code: '123456' })
        ).rejects.toMatchObject({
            response: {
                statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_NOT_MATCH,
            },
        });
        expect(userService.increasePasswordAttempt).toHaveBeenCalledWith(user);
        expect(mfaService.disable).not.toHaveBeenCalled();
    });

    it('refuses a wrong code even with the right password', async () => {
        authService.validateUser.mockResolvedValue(true);
        mfaService.verify.mockResolvedValue(false);

        await expect(
            controller.disable(user, { password: 'pass', code: '000000' })
        ).rejects.toThrow('auth.error.mfaCodeInvalid');
        expect(userService.increasePasswordAttempt).toHaveBeenCalledWith(user);
        expect(mfaService.disable).not.toHaveBeenCalled();
    });

    it('refuses when MFA is not on', async () => {
        user.mfaEnabled = false;

        await expect(
            controller.disable(user, { password: 'pass', code: '123456' })
        ).rejects.toMatchObject({
            response: {
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.MFA_NOT_ENABLED,
            },
        });
    });

    it('returns the recovery codes from enable', async () => {
        mfaService.enable.mockResolvedValue({ recoveryCodes: ['a-b'] });

        const result = await controller.enable(user, { code: '123456' });

        expect(mfaService.enable).toHaveBeenCalledWith(user, '123456');
        expect(result.data).toEqual({ recoveryCodes: ['a-b'] });
    });
});
