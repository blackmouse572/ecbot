import { WorkspaceDocParamsId } from '@app/modules/workspace/constants/workspace.doc.constant';
import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponsePaging,
} from 'src/common/doc/decorators/doc.decorator';
import { ActivityListResponseDto } from 'src/modules/activity/dtos/response/activity.list.response.dto';

export function ActivityWorkspaceListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all activity user in workspace',
        }),
        DocRequest({
            params: WorkspaceDocParamsId,
            queries: [
                {
                    name: 'action',
                    type: String,
                    required: false,
                },
                {
                    name: 'subject',
                    type: String,
                    required: false,
                },
                {
                    name: 'user',
                    type: String,
                    required: false,
                },
                {
                    name: 'by',
                    type: String,
                    required: false,
                },
            ],
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponsePaging<ActivityListResponseDto>('activity.list', {
            dto: ActivityListResponseDto,
        })
    );
}
