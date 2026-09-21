import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaginationQuery } from 'src/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from 'src/common/pagination/dtos/pagination.list.dto';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import { ResponsePaging } from 'src/common/response/decorators/response.decorator';
import { IResponsePaging } from 'src/common/response/interfaces/response.interface';
import { ApiKeyProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from 'src/modules/auth/decorators/auth.jwt.decorator';
import {
    PolicyAbilityProtected,
    PolicyRoleProtected,
} from 'src/modules/policy/decorators/policy.decorator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from 'src/modules/policy/enums/policy.enum';
import { UserProtected } from 'src/modules/user/decorators/user.decorator';
import { WAITLIST_DEFAULT_AVAILABLE_SEARCH } from 'src/modules/waitlist/constants/waitlist.list.constant';
import { WaitlistAdminListDoc } from 'src/modules/waitlist/docs/waitlist.admin.doc';
import { WaitlistListResponseDto } from 'src/modules/waitlist/dtos/response/waitlist.list.response.dto';
import { WaitlistEntity } from 'src/modules/waitlist/repository/entities/waitlist.entity';
import { WaitlistService } from 'src/modules/waitlist/services/waitlist.service';

@ApiTags('modules.admin.waitlist')
@Controller({
    version: '1',
    path: '/waitlist',
})
export class WaitlistAdminController {
    constructor(
        private readonly paginationService: PaginationService,
        private readonly waitlistService: WaitlistService
    ) {}

    @WaitlistAdminListDoc()
    @ResponsePaging('waitlist.list')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.WAITLIST,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @PaginationQuery({ availableSearch: WAITLIST_DEFAULT_AVAILABLE_SEARCH })
        { _search, _limit, _offset, _order }: PaginationListDto
    ): Promise<IResponsePaging<WaitlistListResponseDto>> {
        const find: Record<string, any> = { ..._search };
        const waitlists: WaitlistEntity[] = await this.waitlistService.findAll(
            find,
            { paging: { limit: _limit, offset: _offset }, order: _order }
        );
        const total: number = await this.waitlistService.getTotal(find);
        const totalPage: number = this.paginationService.totalPage(
            total,
            _limit
        );

        return {
            _pagination: { total, totalPage },
            data: this.waitlistService.mapList(waitlists),
        };
    }
}
