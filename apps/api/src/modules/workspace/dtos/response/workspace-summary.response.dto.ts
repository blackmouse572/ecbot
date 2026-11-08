import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

/** The few workspace fields an invitee may see before joining. */
export class WorkspaceSummaryResponseDto {
    @ApiProperty({ example: '0b7f2c1e-0000-4000-8000-000000000001' })
    @Expose()
    id: string;

    @ApiProperty({ example: 'Moc Coffee' })
    @Expose()
    name: string;

    @ApiProperty({ example: 'moc-coffee' })
    @Expose()
    slug: string;

    @ApiProperty({ required: false, nullable: true })
    @Expose()
    avatar?: string;
}
