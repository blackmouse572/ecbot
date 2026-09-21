import { ApiProperty } from '@nestjs/swagger';

export class EmailInvitationToWorkspaceDto {
    @ApiProperty({
        required: true,
        example: 'https://delicious-council.name',
    })
    invitationLink: string;
}
