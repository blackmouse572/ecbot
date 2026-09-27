import { BadRequestException } from '@nestjs/common';
import { ResetPasswordVerifiedPipe } from '@app/modules/reset-password/pipes/reset-password.verified.pipe';
import { ENUM_RESET_PASSWORD_STATUS_CODE_ERROR } from '@app/modules/reset-password/enums/reset-password.status-code.enum';

describe('ResetPasswordVerifiedPipe', () => {
    const pipe = new ResetPasswordVerifiedPipe();

    it('rejects with 400 NOT_VERIFIED when verifyDate is null', async () => {
        await expect(
            pipe.transform({ verifyDate: null } as any)
        ).rejects.toMatchObject({
            response: {
                statusCode: ENUM_RESET_PASSWORD_STATUS_CODE_ERROR.NOT_VERIFIED,
                message: 'resetPassword.error.notVerified',
            },
        });
    });

    it('rejects when verifyDate is undefined', async () => {
        await expect(pipe.transform({} as any)).rejects.toBeInstanceOf(
            BadRequestException
        );
    });

    it('passes the entity through once verifyDate is set', async () => {
        const value = { verifyDate: new Date() };

        await expect(pipe.transform(value as any)).resolves.toBe(value);
    });
});
