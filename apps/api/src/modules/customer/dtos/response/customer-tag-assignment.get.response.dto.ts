import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { CustomerTagGetResponseDto } from './customer-tag.get.response.dto';

export class CustomerTagAssignmentGetResponseDto {
    @Expose()
    @ApiProperty()
    id: string;

    @Expose()
    @Type(() => CustomerTagGetResponseDto)
    @ApiProperty({ type: CustomerTagGetResponseDto })
    tag: CustomerTagGetResponseDto;

    @Expose()
    @ApiProperty()
    createdAt: Date;

    @Expose()
    @ApiProperty({ required: false })
    updatedAt?: Date;
}
