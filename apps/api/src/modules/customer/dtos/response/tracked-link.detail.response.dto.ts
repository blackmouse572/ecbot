import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { TrackedLinkGetResponseDto } from './tracked-link.get.response.dto';

export class TrackedLinkDetailResponseDto extends TrackedLinkGetResponseDto {
    @Expose()
    @Type(() => TrackedLinkGetResponseDto)
    @ApiProperty({ type: [TrackedLinkGetResponseDto] })
    children: TrackedLinkGetResponseDto[];
}
