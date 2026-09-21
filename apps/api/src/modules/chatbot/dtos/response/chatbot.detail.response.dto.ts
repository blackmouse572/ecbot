import { ApiProperty, OmitType, PickType } from '@nestjs/swagger';
import { ChatbotListResponseDto } from './chatbot.list.response.dto';
import { AccountGetDetailResponseDto } from '@app/modules/account/dtos/response/account.detail.response.dto';
import { WorkspaceGetShortResponseDto } from '@app/modules/workspace/dtos/response/workspace.get.response';
import { Expose, Type } from 'class-transformer';
import { IsArray } from 'class-validator';

export class ChatbotGetDetailResponseDto extends OmitType(
    ChatbotListResponseDto,
    ['workspace', 'accounts']
) {
    @ApiProperty({
        description: 'Workspace the chatbot belongs to',
    })
    @Expose()
    @Type(() => WorkspaceGetShortResponseDto)
    workspace: WorkspaceGetShortResponseDto;

    @ApiProperty({
        description: 'Chatbot associate accounts',
        type: [AccountGetDetailResponseDto],
    })
    @Expose()
    @IsArray()
    @Type(() => AccountGetDetailResponseDto)
    accounts: AccountGetDetailResponseDto[];
}
export class ChatbotGetDetailShortResponseDto extends PickType(
    ChatbotListResponseDto,
    [
        'id',
        'status',
        'name',
        'avatar',
        'type',
        'workspace',
        'createdAt',
        'updatedAt',
        'createdBy',
        'updatedBy',
    ]
) {}
