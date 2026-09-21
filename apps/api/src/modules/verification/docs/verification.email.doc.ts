import { VerificationResendEmailRequestDto } from '@app/modules/verification/dtos/request/verification.resend.request.dto';
import { VerificationVerifyEmailRequestDto } from '@app/modules/verification/dtos/request/verification.verify.request.dto';
import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
} from 'src/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from 'src/common/doc/enums/doc.enum';

export function VerificationEmailResendEmailDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'request otp email verification',
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: VerificationResendEmailRequestDto,
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocResponse('verification.requestEmail', {
            httpStatus: HttpStatus.OK,
        })
    );
}

export function VerificationEmailVerifyEmailDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'verify email using otp',
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: VerificationVerifyEmailRequestDto,
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocResponse('verification.verifyEmail', {
            httpStatus: HttpStatus.OK,
        })
    );
}
