import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ENUM_RESET_PASSWORD_STATUS_CODE_ERROR } from 'src/modules/reset-password/enums/reset-password.status-code.enum';
import { ResetPasswordService } from 'src/modules/reset-password/services/reset-password.service';
import { ResetPasswordEntity } from '../repository/entities/reset-password.entity';

// Used on /reset/:token — verify() sets isActive=false intentionally,
// so we only check the TTL clock, not the isActive flag.
@Injectable()
export class ResetPasswordDateExpiredPipe implements PipeTransform {
    constructor(private readonly resetPasswordService: ResetPasswordService) {}

    async transform(value: ResetPasswordEntity): Promise<ResetPasswordEntity> {
        const checkExpired = this.resetPasswordService.checkExpired(
            value.expiredDate
        );
        if (checkExpired) {
            throw new BadRequestException({
                statusCode: ENUM_RESET_PASSWORD_STATUS_CODE_ERROR.EXPIRED,
                message: 'resetPassword.error.expired',
            });
        }
        return value;
    }
}
