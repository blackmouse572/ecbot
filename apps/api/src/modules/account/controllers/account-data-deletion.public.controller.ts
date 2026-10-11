import { parseFacebookSignedRequest } from '@app/common/facebook/utils/facebook-signed-request.util';
import {
    Body,
    Controller,
    HttpStatus,
    Logger,
    Post,
    Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeController } from '@nestjs/swagger';
import { randomBytes } from 'crypto';
import type { Response as ExpressResponse } from 'express';
import { AccountService } from '../services/account.service';

/**
 * Meta's "Data deletion request callback URL". Meta POSTs a signed_request
 * when a person removes the app and asks for their data to be deleted, and
 * expects `{ url, confirmation_code }` back as plain JSON (no envelope).
 * Public: the signed_request signature is the only auth.
 */
@ApiExcludeController()
@Controller({ version: '1', path: '/data-deletion' })
export class AccountDataDeletionPublicController {
    private readonly logger = new Logger(
        AccountDataDeletionPublicController.name
    );

    constructor(
        private readonly accountService: AccountService,
        private readonly configService: ConfigService
    ) {}

    @Post('/facebook')
    async facebook(
        // Read by name, not through a DTO: the global pipe would answer 422
        // if Meta ever adds a field, and the signature check validates it.
        @Body('signed_request') signedRequest: unknown,
        @Res() res: ExpressResponse
    ): Promise<void> {
        const payload = parseFacebookSignedRequest(
            signedRequest,
            this.configService.get<string>('facebook.appSecret') ?? ''
        );
        if (!payload) {
            res.status(HttpStatus.BAD_REQUEST).json({
                error: 'invalid signed_request',
            });
            return;
        }

        const accountIds = await this.accountService.deleteFacebookUserData(
            payload.user_id
        );
        const confirmationCode = randomBytes(6).toString('hex').toUpperCase();
        this.logger.log(
            `Facebook data deletion ${confirmationCode}: ${accountIds.length} login(s) removed [${accountIds.join(', ')}]`
        );

        const statusUrl = new URL(
            this.configService.get<string>('facebook.dataDeletionStatusUrl')
        );
        statusUrl.searchParams.set('code', confirmationCode);
        res.status(HttpStatus.OK).json({
            url: statusUrl.toString(),
            confirmation_code: confirmationCode,
        });
    }
}
