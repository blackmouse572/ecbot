import { UnprocessableEntityException } from '@nestjs/common';

export class UnsupportedPlatformException extends UnprocessableEntityException {
    constructor(accountType: string) {
        super({
            message: 'platform.error.unsupported',
            statusCode: 422,
            errors: { accountType },
        });
    }
}
