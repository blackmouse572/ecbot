import { DatabaseDto } from '@app/common/database/dtos/database.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import {
    ENUM_MARKETING_EVENT_ACTOR,
    ENUM_MARKETING_EVENT_KIND,
} from '../../enums/customer-marketing.enum';

export class MarketingEventGetResponseDto extends DatabaseDto {
    @Expose()
    @ApiProperty({ enum: ENUM_MARKETING_EVENT_KIND })
    kind: ENUM_MARKETING_EVENT_KIND;

    @Expose()
    @ApiProperty({ enum: ENUM_MARKETING_EVENT_ACTOR })
    actor: ENUM_MARKETING_EVENT_ACTOR;

    @Expose()
    @ApiProperty({ required: false, nullable: true })
    oldValue?: string | null;

    @Expose()
    @ApiProperty({ required: false, nullable: true })
    newValue?: string | null;

    @Expose()
    @ApiProperty({ required: false, nullable: true })
    reason?: string | null;

    @Expose()
    @ApiProperty({ required: false, nullable: true })
    conversationId?: string | null;

    @Expose()
    @ApiProperty({ required: false, nullable: true })
    messageId?: string | null;
}
