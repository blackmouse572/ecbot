import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ENUM_TRACKED_LINK_STATUS } from '../../enums/tracked-link.enum';
import { TrackedLinkCreateRequestDto } from './tracked-link.create.request.dto';

export class TrackedLinkUpdateRequestDto extends PartialType(
    OmitType(TrackedLinkCreateRequestDto, ['accountId'] as const)
) {
    @IsOptional()
    @IsEnum(ENUM_TRACKED_LINK_STATUS)
    @ApiProperty({ enum: ENUM_TRACKED_LINK_STATUS, required: false })
    status?: ENUM_TRACKED_LINK_STATUS;
}
