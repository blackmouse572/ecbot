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
import { AccountFacebookDataDeletionRequestDto } from '../dtos/request/account.facebook-data-deletion.request.dto';
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
        @Body() dto: AccountFacebookDataDeletionRequestDto,
        @Res() res: ExpressResponse
    ): Promise<void> {
        const payload = parseFacebookSignedRequest(
            dto.signed_request,
            this.configService.get<string>('facebook.appSecret') ?? ''
        );
        if (!payload) {
            res.status(HttpStatus.BAD_REQUEST).json({
                error: 'invalid signed_request',
            });
            return;
        }

        const deleted = await this.accountService.deleteFacebookUserData(
            payload.user_id
        );
        const confirmationCode = randomBytes(6).toString('hex').toUpperCase();
        this.logger.log(
            `Facebook data deletion ${confirmationCode}: user ${payload.user_id}, ${deleted} login(s) removed`
        );

        const statusUrl = this.configService.get<string>(
            'facebook.dataDeletionStatusUrl'
        );
        res.status(HttpStatus.OK).json({
            url: `${statusUrl}?code=${confirmationCode}`,
            confirmation_code: confirmationCode,
        });
    }
}
