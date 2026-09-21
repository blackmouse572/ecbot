import { Injectable, NotFoundException, PipeTransform } from '@nestjs/common';
import { ResetPasswordEntity } from 'src/modules/reset-password/repository/entities/reset-password.entity';
import { ResetPasswordService } from 'src/modules/reset-password/services/reset-password.service';
import { ENUM_ROLE_STATUS_CODE_ERROR } from 'src/modules/role/enums/role.status-code.enum';

@Injectable()
export class ResetPasswordParseByTokenPipe implements PipeTransform {
    constructor(private readonly resetPasswordService: ResetPasswordService) {}

    async transform(value: any): Promise<ResetPasswordEntity> {
        const resetPassword: ResetPasswordEntity =
            await this.resetPasswordService.findOneByToken(value, {
                populate: ['user'],
            });
        if (!resetPassword) {
            throw new NotFoundException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'resetPassword.error.notFound',
            });
        }

        return resetPassword;
    }
}
