import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class ProductGroupGetResponseDto {
    @Expose()
    @ApiProperty()
    id: string;

    @Expose()
    @ApiProperty()
    name: string;

    @Expose()
    @ApiProperty({ type: Number, required: false, nullable: true })
    defaultRepurchaseDays?: number | null;

    @Expose()
    @ApiProperty({ type: Number, required: false, nullable: true })
    learnedRepurchaseDays?: number | null;

    @Expose()
    @ApiProperty({
        type: Number,
        required: false,
        nullable: true,
        description:
            'The cycle in use: the learned one when there is enough data, else the default',
    })
    repurchaseDays?: number | null;

    @Expose()
    @ApiProperty()
    createdAt: Date;

    @Expose()
    @ApiProperty({ required: false })
    updatedAt?: Date;
}
