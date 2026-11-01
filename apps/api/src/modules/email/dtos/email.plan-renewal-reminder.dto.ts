import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class EmailPlanRenewalReminderDto {
    @ApiProperty({ required: true })
    @IsString()
    @IsNotEmpty()
    workspaceName: string;

    @ApiProperty({ required: true })
    @IsString()
    @IsNotEmpty()
    planName: string;

    @ApiProperty({
        required: true,
        description: 'When the paid period ends unless the next one is paid',
    })
    @IsNotEmpty()
    periodEnd: Date;

    @ApiProperty({
        required: true,
        description:
            'Path to the page where the owner pays for the next period',
    })
    @IsString()
    @IsNotEmpty()
    billingUrl: string;

    @ApiProperty({
        required: false,
        example: 'vi',
        description: 'Language to write the email in; English otherwise',
    })
    @IsOptional()
    @IsString()
    language?: string;
}
