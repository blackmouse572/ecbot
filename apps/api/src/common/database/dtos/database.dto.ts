import { UserMetaResponseDto } from '@app/modules/user/dtos/response/user.meta.response.dto';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';

// Shared by every audit-trail field below so the three decorators don't
// each carry their own inline factory.
const userMetaType = (): typeof UserMetaResponseDto => UserMetaResponseDto;

export class DatabaseDto {
    @ApiProperty({
        description: 'Alias id of api key',
        example: 'b9e8177f-bb23-4000-9471-19761dc6726e',
        required: true,
    })
    @Expose()
    id: string;

    @ApiProperty({
        description: 'Date created at',
        example: new Date('2026-08-30T05:57:59.265Z'),
        required: true,
    })
    @Expose()
    createdAt: Date;

    @ApiProperty({
        description: 'created by',
        required: false,
        type: UserMetaResponseDto,
    })
    @Expose()
    @Type(userMetaType)
    createdBy?: UserMetaResponseDto;

    @ApiProperty({
        description: 'Date updated at',
        example: new Date('2026-08-30T01:15:36.079Z'),
        required: true,
    })
    @Expose()
    updatedAt: Date;

    @ApiProperty({
        description: 'updated by',
        required: false,
        type: UserMetaResponseDto,
    })
    @Expose()
    @Type(userMetaType)
    updatedBy?: UserMetaResponseDto;

    @ApiProperty({
        description: 'Flag for deleted',
        default: false,
        required: true,
    })
    @Expose()
    deleted: boolean;

    @ApiProperty({
        description: 'Date delete at',
        required: false,
    })
    @Expose()
    deletedAt?: Date;

    @ApiProperty({
        description: 'Delete by',
        required: false,
        type: UserMetaResponseDto,
    })
    @Expose()
    @Type(userMetaType)
    deletedBy?: UserMetaResponseDto;

    @ApiHideProperty()
    @Exclude()
    __v?: string;
}
