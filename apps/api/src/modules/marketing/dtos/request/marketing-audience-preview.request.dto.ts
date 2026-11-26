import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsOptional, IsUUID } from 'class-validator';
import { MARKETING_AUDIENCE_MAX_EXCLUDED } from '../../constants/marketing-audience.constant';
import { MarketingAudienceRequestDto } from './marketing-audience.request.dto';

/** An audience for a send: a preset or conditions, less who the shop unticked. */
export class MarketingAudiencePreviewRequestDto extends MarketingAudienceRequestDto {
    @ApiPropertyOptional({
        type: [String],
        description:
            'Customers the shop unticked; they get nothing from this send',
    })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(MARKETING_AUDIENCE_MAX_EXCLUDED)
    @IsUUID('all', { each: true })
    excludedCustomerIds?: string[];
}
