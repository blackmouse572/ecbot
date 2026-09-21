import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'src/common/response/decorators/response.decorator';
import { ENUM_TURNSTILE_ACTION } from 'src/common/turnstile/enums/turnstile.action.enum';
import { TurnstileService } from 'src/common/turnstile/services/turnstile.service';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { ApiKeyPublicProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import { WaitlistPublicJoinDoc } from 'src/modules/waitlist/docs/waitlist.public.doc';
import { WaitlistJoinRequestDto } from 'src/modules/waitlist/dtos/request/waitlist.join.request.dto';
import { WaitlistService } from 'src/modules/waitlist/services/waitlist.service';

@ApiTags('modules.public.waitlist')
@Controller({
    version: '1',
    path: '/waitlist',
})
export class WaitlistPublicController {
    constructor(
        private readonly waitlistService: WaitlistService,
        private readonly turnstileService: TurnstileService
    ) {}

    @WaitlistPublicJoinDoc()
    @Response('waitlist.join')
    @ApiKeyPublicProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/join')
    async join(@Body() dto: WaitlistJoinRequestDto): Promise<IResponse> {
        await this.turnstileService.verify(
            dto.turnstileToken,
            ENUM_TURNSTILE_ACTION.WAITLIST
        );
        await this.waitlistService.join(dto);

        return {};
    }
}
