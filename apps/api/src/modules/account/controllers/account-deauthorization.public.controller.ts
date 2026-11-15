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
import type { Response as ExpressResponse } from 'express';
import { AccountService } from '../services/account.service';

/**
 * Meta's "Deauthorize Callback URL". Meta POSTs a signed_request when a person
 * removes the app from Facebook; from that moment every token issued under the
 * grant is dead, so the logins are marked disconnected here instead of being
 * discovered by a failed send. Meta only expects a 200 back. Public: the
 * signed_request signature is the only auth.
 */
@ApiExcludeController()
@Controller({ version: '1', path: '/deauthorization' })
export class AccountDeauthorizationPublicController {
    private readonly logger = new Logger(
        AccountDeauthorizationPublicController.name
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
            this.logger.warn(
                'Facebook deauthorize rejected: invalid signed_request'
            );
            res.status(HttpStatus.BAD_REQUEST).json({
                error: 'invalid signed_request',
            });
            return;
        }

        const accountIds =
            await this.accountService.deauthorizeFacebookUserData(
                payload.user_id
            );
        this.logger.log(
            `Facebook deauthorization: ${accountIds.length} login(s) disconnected [${accountIds.join(', ')}]`
        );

        res.status(HttpStatus.OK).json({ success: true });
    }
}
