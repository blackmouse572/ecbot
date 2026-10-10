import { IResponse } from '@app/common/response/interfaces/response.interface';
import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';
import { ActivityService } from '@app/modules/activity/services/activity.service';
import { ApiKeyProtected } from '@app/modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@app/modules/auth/decorators/auth.jwt.decorator';
import { ENUM_POLICY_SUBJECT } from '@app/modules/policy/enums/policy.enum';
import { UserProtected } from '@app/modules/user/decorators/user.decorator';
import { UserParsePipe } from '@app/modules/user/pipes/user.parse.pipe';
import { UserEntity } from '@app/modules/user/repository/entities/user.entity';
import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'src/common/response/decorators/response.decorator';
import { ExportUserMeDoc } from '../docs/export.doc';
import { UserDataExportResponseDto } from '../dtos/response/user-data-export.response.dto';
import { UserDataExportService } from '../services/user-data-export.service';

@ApiTags('modules.user.export')
@Controller({
    version: '1',
    path: '/export',
})
export class ExportUserController {
    constructor(
        private readonly userDataExportService: UserDataExportService,
        private readonly activityService: ActivityService
    ) {}

    @ExportUserMeDoc()
    @Response('export.user')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Throttle({ default: { ttl: 60000, limit: 5 } })
    @Header('Content-Disposition', 'attachment; filename="my-data.json"')
    @Get('/me')
    async me(
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<UserDataExportResponseDto>> {
        const data = await this.userDataExportService.export(user);
        await this.activityService.createByUser(user, {
            action: ENUM_ACTIVITY_ACTION.EXPORT,
            subject: ENUM_POLICY_SUBJECT.USER,
            metadata: { id: user.id },
        });
        return { data };
    }
}
