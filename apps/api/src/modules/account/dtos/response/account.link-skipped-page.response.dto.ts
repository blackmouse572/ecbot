import { ApiProperty } from '@nestjs/swagger';
import { ENUM_ACCOUNT_TYPE } from '../../enums/account.enum';

/** A Page the login manages that another workspace has already connected. */
export class AccountLinkSkippedPageResponseDto {
    @ApiProperty({ description: 'Platform id of the Page', example: '1234' })
    externalId: string;

    @ApiProperty({ example: 'My Shop' })
    name: string;

    @ApiProperty({ required: false })
    avatar?: string;

    @ApiProperty({
        enum: ENUM_ACCOUNT_TYPE,
        example: ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
    })
    type: ENUM_ACCOUNT_TYPE;
}
