import { ENUM_POLICY_SUBJECT } from '@app/modules/policy/enums/policy.enum';
import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { DatabaseDto } from 'src/common/database/dtos/database.dto';
import { UserShortResponseDto } from 'src/modules/user/dtos/response/user.short.response.dto';
import { ENUM_ACTIVITY_ACTION } from '../../enums/activity.enum';

export class ActivityListResponseDto extends DatabaseDto {
    @ApiProperty({
        required: true,
        example: '91dbd24d-0a1c-448d-b360-93b3a6c9b4bf',
    })
    user: string;

    @ApiProperty({
        required: true,
        type: 'string',
        enum: ENUM_ACTIVITY_ACTION,
        example: ENUM_ACTIVITY_ACTION.CREATE,
    })
    action: ENUM_ACTIVITY_ACTION;

    @ApiProperty({
        required: true,
        type: 'string',
        enum: ENUM_POLICY_SUBJECT,
        example: ENUM_POLICY_SUBJECT.USER,
    })
    subject: ENUM_POLICY_SUBJECT;

    @ApiProperty({
        required: true,
        type: UserShortResponseDto,
        oneOf: [{ $ref: getSchemaPath(UserShortResponseDto) }],
    })
    @Type(() => UserShortResponseDto)
    by: UserShortResponseDto;

    @ApiProperty({
        required: false,
        type: Object,
        example: {},
    })
    metadata?: Record<string, any>;
}
