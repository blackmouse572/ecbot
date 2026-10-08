import { ApiProperty } from '@nestjs/swagger';

export class EmailMemberJoinedDto {
    @ApiProperty({ required: true, example: 'Tran Linh' })
    memberName: string;

    @ApiProperty({ required: true, example: 'linh@example.com' })
    memberEmail: string;

    @ApiProperty({ required: true, example: 'Kunmart' })
    workspaceName: string;

    @ApiProperty({
        required: true,
        example: '/kunmart/members',
        description: 'Relative path to the workspace members page',
    })
    membersUrl: string;

    @ApiProperty({
        required: false,
        example: 'vi',
        description: 'Language to write the email in; English otherwise',
    })
    language?: string;
}
