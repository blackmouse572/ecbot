import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { ENUM_VERIFICATION_STATUS_CODE_ERROR } from 'src/modules/verification/enums/verification.status-code.constant';

@Injectable()
export class VerificationUserEmailNotVerifiedYetPipe implements PipeTransform {
    async transform(value: UserEntity): Promise<UserEntity> {
        if (value.verification.email) {
            throw new BadRequestException({
                statusCode: ENUM_VERIFICATION_STATUS_CODE_ERROR.VERIFIED,
                message: 'verification.error.userEmailVerified',
            });
        }

        return value;
    }
}

@Injectable()
export class VerificationUserMobileNumberNotVerifiedYetPipe implements PipeTransform {
    async transform(value: UserEntity): Promise<UserEntity> {
        if (value.verification.mobileNumber) {
            throw new BadRequestException({
                statusCode: ENUM_VERIFICATION_STATUS_CODE_ERROR.VERIFIED,
                message: 'verification.error.userMobileNumberVerified',
            });
        }

        return value;
    }
}
