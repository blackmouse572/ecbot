import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { DatabaseDto } from 'src/common/database/dtos/database.dto';

export class CountryListResponseDto extends DatabaseDto {
    @ApiProperty({
        required: true,
        description: 'Country name',
        example: 'Panama',
        maxLength: 100,
        minLength: 1,
    })
    name: string;

    @ApiProperty({
        required: true,
        description: 'Country code, Alpha 2 code version',
        example: 'KI',
        maxLength: 2,
        minLength: 2,
    })
    alpha2Code: string;

    @ApiProperty({
        required: true,
        description: 'Country code, Alpha 3 code version',
        example: 'COK',
        maxLength: 3,
        minLength: 3,
    })
    alpha3Code: string;

    @ApiProperty({
        required: true,
        description: 'Country code, Numeric code version',
        example: '762',
        maxLength: 3,
        minLength: 3,
    })
    numericCode: string;

    @ApiProperty({
        required: true,
        description: 'Country code, FIPS version',
        example: 'BF',
        maxLength: 2,
        minLength: 2,
    })
    fipsCode: string;

    @ApiProperty({
        required: true,
        description: 'Country phone code',
        example: ['62'],
        maxLength: 4,
        minLength: 4,
        isArray: true,
    })
    phoneCode: string[];

    @ApiProperty({
        required: true,
        example: 'Kazakhstan',
    })
    continent: string;

    @ApiProperty({
        required: true,
        example: 'America/Bahia_Banderas',
    })
    timeZone: string;

    @ApiProperty({
        required: true,
        example: 'VND',
    })
    currency: string;

    @ApiProperty({
        description: 'Date created at',
        example: new Date('2026-08-30T02:25:31.218Z'),
        required: true,
    })
    createdAt: Date;

    @ApiProperty({
        description: 'Date updated at',
        example: new Date('2026-08-29T14:40:07.266Z'),
        required: true,
    })
    updatedAt: Date;

    @ApiHideProperty()
    @Exclude()
    deletedAt?: Date;
}
