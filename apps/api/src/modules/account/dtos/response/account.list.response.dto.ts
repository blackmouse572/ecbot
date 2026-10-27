import { AccountGetResponseDto } from '@app/modules/account/dtos/response/account.get.response.dto';
import { ENUM_CHATBOT_TYPE } from '@app/modules/chatbot/enums/chatbot.enum';
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

class AccountChatbotSummary {
    @ApiProperty({ description: 'Chatbot ID' })
    id: string;

    @ApiProperty({ description: 'Chatbot name' })
    name: string;

    @ApiProperty({
        description: 'Business type of the chatbot',
        enum: ENUM_CHATBOT_TYPE,
        type: String,
    })
    type: ENUM_CHATBOT_TYPE;
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
        description:
            'The chatbot answering on this channel; null when none is linked (a soft-deleted chatbot counts as none)',
        type: AccountChatbotSummary,
        nullable: true,
    })
    chatbot: AccountChatbotSummary | null;

    @ApiProperty({
        description: 'The user who added the account',
        type: AddedBy,
        required: true,
        default: null,
    })
    addedBy: AddedBy;
}
