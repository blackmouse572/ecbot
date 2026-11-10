import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ENUM_TRACKED_LINK_KIND } from '../../enums/tracked-link.enum';

export const TRACKED_LINK_CHILD_KINDS = [
    ENUM_TRACKED_LINK_KIND.QR,
    ENUM_TRACKED_LINK_KIND.KOL,
] as const;

export class TrackedLinkCreateChildRequestDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(120)
    @ApiProperty({ example: 'Linh Đan' })
    name: string;

    @IsIn(TRACKED_LINK_CHILD_KINDS)
    @ApiProperty({ enum: TRACKED_LINK_CHILD_KINDS })
    kind: (typeof TRACKED_LINK_CHILD_KINDS)[number];
}
