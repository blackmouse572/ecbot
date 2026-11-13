import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsUUID } from 'class-validator';

export class OrderSummaryRequestDto {
    @ApiProperty({ description: 'The customer whose orders are summed' })
    // The global pipe skips undefined values; IsDefined still runs.
    @IsDefined()
    @IsUUID()
    customer: string;
}
