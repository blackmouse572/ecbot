import { ENUM_POLICY_SUBJECT } from '@app/modules/policy/enums/policy.enum';
import { ApiProperty } from '@nestjs/swagger';
import { ENUM_ACTIVITY_ACTION } from '../../enums/activity.enum';
export class ActivityCreateRequest {
    @ApiProperty({
        example: ENUM_POLICY_SUBJECT.USER,
        required: true,
        enum: ENUM_POLICY_SUBJECT,
    })
    subject: ENUM_POLICY_SUBJECT;

    @ApiProperty({
        example: ENUM_ACTIVITY_ACTION.CREATE,
        required: true,
        enum: ENUM_ACTIVITY_ACTION,
    })
    action: ENUM_ACTIVITY_ACTION;

    @ApiProperty({
        required: false,
        type: Object,
        description: 'Data object',
    })
    metadata?: Record<string, any>;
}
