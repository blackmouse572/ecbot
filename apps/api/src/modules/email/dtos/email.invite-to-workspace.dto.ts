import { ApiProperty } from '@nestjs/swagger';

export class EmailInvitationToWorkspaceDto {
    @ApiProperty({
        required: true,
        example: 'https://delicious-council.name',
    })
    invitationLink: string;

    @ApiProperty({ required: true, example: 'Kunmart' })
    workspaceName: string;

    @ApiProperty({ required: true, example: 'Chi Nguyen' })
    inviterName: string;

    @ApiProperty({
        required: false,
        description: 'When the invitation link stops working',
    })
    expiresAt?: Date;

    @ApiProperty({
        required: false,
        example: 'vi',
        description: 'Language to write the email in; English otherwise',
    })
    language?: string;
}
