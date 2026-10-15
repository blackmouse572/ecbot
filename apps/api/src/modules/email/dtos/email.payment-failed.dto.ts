import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class EmailPaymentFailedDto {
    @ApiProperty({ required: true })
    @IsString()
    @IsNotEmpty()
    workspaceName: string;

    @ApiProperty({
        required: true,
        description:
            'When the chatbots stop answering unless a payment goes through',
    })
    @IsNotEmpty()
    graceEndsAt: Date;

    @ApiProperty({
        required: true,
        description: 'Path to the page where the owner fixes the payment',
    })
    @IsString()
    @IsNotEmpty()
    billingUrl: string;

    @ApiProperty({
        required: false,
        description:
            'True for the reminder sent shortly before the grace period ends',
    })
    @IsOptional()
    @IsBoolean()
    reminder?: boolean;

    @ApiProperty({
        required: false,
        example: 'vi',
        description: 'Language to write the email in; English otherwise',
    })
    @IsOptional()
    @IsString()
    language?: string;
}
