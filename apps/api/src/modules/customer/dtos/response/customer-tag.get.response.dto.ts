import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class CustomerTagGetResponseDto {
    @Expose()
    @ApiProperty()
    id: string;

    @Expose()
    @ApiProperty()
    name: string;

    @Expose()
    @ApiProperty({ required: false, nullable: true })
    emoji?: string;

    @Expose()
    @ApiProperty({ required: false, nullable: true })
    description?: string;

    @Expose()
    @ApiProperty()
    triggersHandoff: boolean;

    @Expose()
    @ApiProperty()
    createdAt: Date;

    @Expose()
    @ApiProperty({ required: false })
    updatedAt?: Date;
}
