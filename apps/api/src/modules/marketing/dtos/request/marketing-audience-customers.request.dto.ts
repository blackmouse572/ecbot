import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { MARKETING_AUDIENCE_MAX_SEARCH_LENGTH } from '../../constants/marketing-audience.constant';
import { MarketingAudienceRequestDto } from './marketing-audience.request.dto';

/** Who an audience reaches, narrowed to one channel or a name. */
export class MarketingAudienceCustomersRequestDto extends MarketingAudienceRequestDto {
    @ApiPropertyOptional({
        enum: ENUM_ACCOUNT_TYPE,
        description: 'Only customers reachable on this channel',
    })
    @IsOptional()
    @IsEnum(ENUM_ACCOUNT_TYPE)
    platform?: ENUM_ACCOUNT_TYPE;

    @ApiPropertyOptional({ description: 'Part of the customer name' })
    @IsOptional()
    @IsString()
    @MaxLength(MARKETING_AUDIENCE_MAX_SEARCH_LENGTH)
    search?: string;
}
