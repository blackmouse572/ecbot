import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

/** "Tạm hoãn <product group> đến <date>". */
export class CustomerProductReactionGetResponseDto {
    @Expose()
    @ApiProperty()
    productGroupId: string;

    @Expose()
    @ApiProperty()
    productGroupName: string;

    @Expose()
    @ApiProperty()
    until: Date;

    @Expose()
    @ApiProperty({ required: false, nullable: true })
    reason?: string | null;
}
