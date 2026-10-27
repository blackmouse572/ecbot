import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class EmailLowTokenBalanceDto {
    @ApiProperty({ required: true })
    @IsString()
    @IsNotEmpty()
    workspaceName: string;

    @ApiProperty({ required: true, description: 'Percent of quota consumed' })
    @IsInt()
    usedPercent: number;

    @ApiProperty({ required: true, description: 'When the period renews' })
    @IsNotEmpty()
    periodEnd: Date;

    @ApiProperty({ required: true, description: 'Path to the usage page' })
    @IsString()
    @IsNotEmpty()
    usageUrl: string;

    @ApiProperty({
        required: false,
        example: 'vi',
        description: 'Language to write the email in; English otherwise',
    })
    @IsOptional()
    @IsString()
    language?: string;
}
