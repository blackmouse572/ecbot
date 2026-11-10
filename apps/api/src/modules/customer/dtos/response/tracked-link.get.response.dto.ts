import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import {
    ENUM_TRACKED_LINK_KIND,
    ENUM_TRACKED_LINK_STATUS,
} from '../../enums/tracked-link.enum';
import { TrackedLinkAccountResponseDto } from './tracked-link.account.response.dto';

export class TrackedLinkGetResponseDto {
    @Expose()
    @ApiProperty()
    id: string;

    @Expose()
    @ApiProperty()
    name: string;

    @Expose()
    @ApiProperty({ example: 'to-roi-tet' })
    code: string;

    @Expose()
    @ApiProperty({ enum: ENUM_TRACKED_LINK_KIND })
    kind: ENUM_TRACKED_LINK_KIND;

    @Expose()
    @ApiProperty({ enum: ENUM_TRACKED_LINK_STATUS })
    status: ENUM_TRACKED_LINK_STATUS;

    @Expose()
    @ApiProperty({
        type: String,
        nullable: true,
        description:
            'The link customers open; null when the channel cannot carry a code',
    })
    url: string | null;

    @Expose()
    @ApiProperty({ type: String, required: false, nullable: true })
    greeting?: string | null;

    @Expose()
    @ApiProperty({ type: [String] })
    tagIds: string[];

    @Expose()
    @ApiProperty()
    promisesOffer: boolean;

    @Expose()
    @ApiProperty({ type: String, required: false, nullable: true })
    targetUrl?: string | null;

    @Expose()
    @Type(() => TrackedLinkAccountResponseDto)
    @ApiProperty({ type: TrackedLinkAccountResponseDto })
    account: TrackedLinkAccountResponseDto;

    @Expose()
    @ApiProperty()
    createdAt: Date;

    @Expose()
    @ApiProperty({ required: false })
    updatedAt?: Date;
}
