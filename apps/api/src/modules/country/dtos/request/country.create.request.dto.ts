import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
    ArrayNotEmpty,
    IsArray,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';

export class CountryCreateRequestDto {
    @ApiProperty({
        required: true,
        description: 'Country name',
        example: 'Timor-Leste',
        maxLength: 100,
        minLength: 1,
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(100)
    @MinLength(1)
    name: string;

    @ApiProperty({
        required: true,
        description: 'Country code, Alpha 2 code version',
        example: 'RO',
        maxLength: 2,
        minLength: 2,
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(2)
    @MinLength(2)
    @Transform(({ value }) => value.toUpperCase())
    alpha2Code: string;

    @ApiProperty({
        required: true,
        description: 'Country code, Alpha 3 code version',
        example: 'DZA',
        maxLength: 3,
        minLength: 3,
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(3)
    @MinLength(3)
    @Transform(({ value }) => value.toUpperCase())
    alpha3Code: string;

    @ApiProperty({
        required: true,
        description: 'Country code, Numeric code version',
        example: '496',
        maxLength: 3,
        minLength: 1,
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(3)
    @MinLength(1)
    numericCode: string;

    @ApiProperty({
        required: true,
        description: 'Country code, FIPS version',
        example: 'BF',
        maxLength: 2,
        minLength: 2,
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(2)
    @MinLength(2)
    @IsOptional()
    fipsCode?: string;

    @ApiProperty({
        required: true,
        description: 'Country phone code',
        example: ['65'],
        maxLength: 4,
        isArray: true,
    })
    @IsArray()
    @ArrayNotEmpty()
    @IsNotEmpty({ each: true })
    @IsString({ each: true })
    @MaxLength(4, { each: true })
    phoneCode: string[];

    @ApiProperty({
        required: true,
        example: 'France',
    })
    @IsNotEmpty()
    @IsString()
    continent: string;

    @ApiProperty({
        required: true,
        example: 'Asia/Bahrain',
    })
    @IsNotEmpty()
    @IsString()
    timeZone: string;

    @ApiProperty({
        required: true,
        example: 'USD',
    })
    @IsNotEmpty()
    @IsString()
    currency: string;
}
