import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import { ENUM_INVITATION_STATUS } from '../../enums/invitation.enum';

export class InvitationDetailResponseDto {
    @ApiProperty({
        example: '60f7b3b9d8c4a5e9c8b8e1a2',
        description: 'Invitation ID',
    })
    @Type(() => String)
    @Expose()
    _id: string;

    @ApiProperty({
        example: '60f7b3b9d8c4a5e9c8b8e1a3',
        description: 'Workspace ID',
    })
    @Expose()
    workspaceId: string;

    @ApiProperty({
        example: '60f7b3b9d8c4a5e9c8b8e1a4',
        description: 'Inviter user ID',
    })
    @Expose()
    inviterId: string;

    @ApiProperty({
        example: 'user@example.com',
        description: 'Invited email address',
    })
    @Expose()
    inviteeEmail: string;

    @ApiProperty({
        example: '60f7b3b9d8c4a5e9c8b8e1a5',
        description: 'Role ID assigned to the invitation',
        required: false,
    })
    @Expose()
    roleId?: string;

    @ApiProperty({
        example: ENUM_INVITATION_STATUS.PENDING,
        description: 'Invitation status',
        enum: ENUM_INVITATION_STATUS,
    })
    @Expose()
    status: ENUM_INVITATION_STATUS;

    @ApiProperty({
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        description: 'Invitation token',
    })
    @Expose()
    token: string;

    @ApiProperty({
        example: 'https://app.example.com/join?token=xyz123',
        description: 'Invitation link',
    })
    @Expose()
    invitationLink: string;

    @ApiProperty({
        example: '2024-01-01T00:00:00.000Z',
        description: 'Invitation expiration date',
    })
    @Expose()
    @Transform(({ value }) => value?.toISOString?.() || value)
    expiresAt: Date;

    @ApiProperty({
        example: '2024-01-01T00:00:00.000Z',
        description: 'Date when invitation was created',
    })
    @Expose()
    @Transform(({ value }) => value?.toISOString?.() || value)
    createdAt: Date;

    @ApiProperty({
        example: '2024-01-01T00:00:00.000Z',
        description: 'Date when invitation was accepted',
        required: false,
    })
    @Expose()
    @Transform(({ value }) => value?.toISOString?.() || value)
    acceptedAt?: Date;

    @ApiProperty({
        example: '60f7b3b9d8c4a5e9c8b8e1a6',
        description: 'User ID who accepted the invitation',
        required: false,
    })
    @Expose()
    acceptedByUserId?: string;

    @ApiProperty({
        example: '2024-01-01T00:00:00.000Z',
        description: 'Date when invitation was revoked',
        required: false,
    })
    @Expose()
    @Transform(({ value }) => value?.toISOString?.() || value)
    revokedAt?: Date;

    @ApiProperty({
        example: '60f7b3b9d8c4a5e9c8b8e1a7',
        description: 'User ID who revoked the invitation',
        required: false,
    })
    @Expose()
    revokedByUserId?: string;
}
