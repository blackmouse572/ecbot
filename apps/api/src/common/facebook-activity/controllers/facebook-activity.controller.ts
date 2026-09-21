import { applyDecorators, Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaginationQuery } from 'src/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from 'src/common/pagination/dtos/pagination.list.dto';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import { RequestRequiredPipe } from 'src/common/request/pipes/request.required.pipe';
import { IResponsePaging } from 'src/common/response/interfaces/response.interface';
import { ApiKeySystemProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from 'src/modules/auth/decorators/auth.jwt.decorator';
import { PolicyRoleProtected } from 'src/modules/policy/decorators/policy.decorator';
import { ENUM_POLICY_ROLE_TYPE } from 'src/modules/policy/enums/policy.enum';
import { UserProtected } from 'src/modules/user/decorators/user.decorator';
import {
    FacebookActivityListingDoc,
    FacebookActivityPageListingDoc,
    FacebookActivitySenderListingDoc,
} from '../docs/facebook-activity.doc';
import { FacebookActivityListResponseDto as ActivityDto } from '../dtos/response/facebook-activity.list.response.dto';
import { ActivityFilter } from '../interfaces/facebook-activity.service.interface';
import { FacebookActivityService } from '../services/facebook-activity.service';

/**
 * Guard stack the three listings share, written in the order Nest applies the
 * guards, which is the order the separate decorators produced.
 */
function SystemAdminProtected(): MethodDecorator {
    const guards = [
        UserProtected(),
        AuthJwtAccessProtected(),
        ApiKeySystemProtected(),
        PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN),
    ];

    return applyDecorators(...guards);
}

@ApiTags('modules.system.facebook.activity')
@Controller('facebook/activity')
export class FacebookActivityController {
    constructor(
        private readonly activities: FacebookActivityService,
        private readonly pagination: PaginationService
    ) {}

    @FacebookActivityListingDoc()
    @Get('/list')
    @SystemAdminProtected()
    list(
        @PaginationQuery() query: PaginationListDto
    ): Promise<IResponsePaging<ActivityDto>> {
        return this.page(query);
    }

    @FacebookActivityPageListingDoc()
    @Get('/page/:pageId/list')
    @SystemAdminProtected()
    listByPageId(
        @Param('pageId', RequestRequiredPipe)
        pageId: string,
        @PaginationQuery({ availableSearch: ['senderId', 'eventType'] })
        query: PaginationListDto
    ): Promise<IResponsePaging<ActivityDto>> {
        return this.page(query, { pageId });
    }

    @FacebookActivitySenderListingDoc()
    @Get('/sender/:senderId/list')
    @SystemAdminProtected()
    listBySenderId(
        @Param('senderId', RequestRequiredPipe)
        senderId: string,
        @PaginationQuery({ availableSearch: ['pageId', 'eventType'] })
        query: PaginationListDto
    ): Promise<IResponsePaging<ActivityDto>> {
        return this.page(query, { senderId });
    }

    /** One scoped page of the feed: fetch the slice, count the rest, map it. */
    private async page(
        query: PaginationListDto,
        scope: ActivityFilter = {}
    ): Promise<IResponsePaging<ActivityDto>> {
        const where: ActivityFilter = { ...query._search, ...scope };
        const rows = await this.activities.findAll(where, {
            paging: { limit: query._limit, offset: query._offset },
            order: query._order,
        });

        const total = await this.activities.getTotal(where);
        const totalPage = this.pagination.totalPage(total, query._limit);
        const data = this.activities.mapList(rows);

        return { _pagination: { total, totalPage }, data };
    }
}
