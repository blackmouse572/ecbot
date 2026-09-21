import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CountryShortResponseDto } from 'src/modules/country/dtos/response/country.short.response.dto';

export class UserMobileNumberResponseDto {
    @ApiProperty({
        example: '8255398988',
        required: true,
        maxLength: 20,
        minLength: 8,
    })
    number: string;

    @ApiProperty({
        required: true,
        type: CountryShortResponseDto,
        oneOf: [{ $ref: getSchemaPath(CountryShortResponseDto) }],
    })
    @Type(() => CountryShortResponseDto)
    country: CountryShortResponseDto;
}
