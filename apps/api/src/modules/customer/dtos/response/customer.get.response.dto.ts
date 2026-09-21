import { DatabaseDto } from '@app/common/database/dtos/database.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class CustomerGetResponseDto extends DatabaseDto {
    @Expose()
    @ApiProperty({ required: false, nullable: true })
    name?: string;

    @Expose()
    @ApiProperty({ required: false, nullable: true })
    phone?: string;

    @Expose()
    @ApiProperty({ required: false, nullable: true })
    email?: string;

    @Expose()
    @ApiProperty({ required: false, nullable: true })
    language?: string;

    @Expose()
    @ApiProperty({ required: false, nullable: true })
    notes?: string;

    @Expose()
    @ApiProperty({ required: false, nullable: true })
    profileSummary?: string;

    @Expose()
    @ApiProperty({ required: false, nullable: true })
    mergedIntoCustomerId?: string;
}
