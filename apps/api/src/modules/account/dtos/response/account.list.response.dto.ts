import { AccountGetResponseDto } from '@app/modules/account/dtos/response/account.get.response.dto';
import { ApiProperty, OmitType } from '@nestjs/swagger';
class AddedBy {
    @ApiProperty({
        description: 'ID of the user who added the account',
        required: true,
    })
    _id: string;

    @ApiProperty({
        description: 'Name of the user who added the account',
        required: true,
    })
    name: string;

    @ApiProperty({
        description: 'Email of the user who added the account',
        required: true,
    })
    email: string;

    @ApiProperty({
        description: 'Avatar URL of the user who added the account',
        required: false,
        default: null,
    })
    avatar: string | null;
}

export class AccountListResponseDto extends OmitType(AccountGetResponseDto, [
    'deleted',
    'createdBy',
    'updatedBy',
    'deletedAt',
    'deletedBy',
] as const) {
    @ApiProperty({
        description: 'Number of cookies associated with the account',
        required: true,
        default: 0,
    })
    totalCookies: number;

    @ApiProperty({
        description: 'Number of proxies associated with the account',
        required: true,
        default: 0,
    })
    totalProxies: number;

    @ApiProperty({
        description: 'The user who added the account',
        type: AddedBy,
        required: true,
        default: null,
    })
    addedBy: AddedBy;
}
