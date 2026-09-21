import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class CustomerUpdateRequestDto {
    @IsOptional()
    @IsString()
    @MaxLength(255)
    @ApiProperty({ required: false, nullable: true })
    name?: string | null;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    @ApiProperty({ required: false, nullable: true })
    phone?: string | null;

    @IsOptional()
    @IsEmail()
    @MaxLength(255)
    @ApiProperty({ required: false, nullable: true })
    email?: string | null;

    @IsOptional()
    @IsString()
    @MaxLength(10)
    @ApiProperty({ required: false, nullable: true })
    language?: string | null;

    @IsOptional()
    @IsString()
    @MaxLength(5000)
    @ApiProperty({ required: false, nullable: true })
    notes?: string | null;

    @IsOptional()
    @IsString()
    @MaxLength(5000)
    @ApiProperty({ required: false, nullable: true })
    profileSummary?: string | null;
}
