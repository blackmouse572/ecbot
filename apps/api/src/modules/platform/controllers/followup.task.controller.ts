import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiKeySystemProtected } from '@app/modules/api-key/decorators/api-key.decorator';
import { RequestTimeout } from 'src/common/request/decorators/request.decorator';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { FollowupTaskHandleDoc } from '../docs/followup.task.doc';
import { FollowupTaskDto } from '../dtos/followup.task.dto';
import { ENUM_FOLLOWUP_PROCESS } from '../constants/followup.constant';
import { FollowupService } from '../services/followup.service';

@ApiTags('modules.tasks.followup')
@Controller({ version: '1', path: '/tasks' })
export class FollowupTaskController {
    constructor(private readonly followupService: FollowupService) {}

    @FollowupTaskHandleDoc()
    @Response('followup.task.processed')
    @ApiKeySystemProtected()
    @RequestTimeout('300s')
    @Post('/followup')
    async handle(@Body() dto: FollowupTaskDto): Promise<IResponse> {
        switch (dto.jobName) {
            case ENUM_FOLLOWUP_PROCESS.FIRE:
                await this.followupService.fire(dto);
                break;
        }

        return {};
    }
}
