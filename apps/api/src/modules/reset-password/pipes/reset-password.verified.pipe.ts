import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ENUM_RESET_PASSWORD_STATUS_CODE_ERROR } from 'src/modules/reset-password/enums/reset-password.status-code.enum';
import { ResetPasswordEntity } from '../repository/entities/reset-password.entity';

// Used on /reset/:token — a password can only be reset once the OTP for
// this row has been verified (verifyDate set via /verify/:token).
@Injectable()
export class ResetPasswordVerifiedPipe implements PipeTransform {
    async transform(value: ResetPasswordEntity): Promise<ResetPasswordEntity> {
        if (!value.verifyDate) {
            throw new BadRequestException({
                statusCode: ENUM_RESET_PASSWORD_STATUS_CODE_ERROR.NOT_VERIFIED,
                message: 'resetPassword.error.notVerified',
            });
        }

        return value;
    }
}
