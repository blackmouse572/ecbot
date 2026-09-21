import { ApiProperty } from '@nestjs/swagger';
import { DatabaseDto } from 'src/common/database/dtos/database.dto';
import { ENUM_SESSION_STATUS } from 'src/modules/session/enums/session.enum';

export class SessionListResponseDto extends DatabaseDto {
    @ApiProperty({
        required: true,
        example: 'af3d21e2-b81c-4b06-a3a1-93d83cb6a4a1',
    })
    user: string;

    @ApiProperty({
        description: 'Date expired at',
        example: new Date('2026-08-29T20:06:53.144Z'),
        required: true,
    })
    expiredAt: Date;

    @ApiProperty({
        description: 'Date expired at',
        example: new Date('2026-08-30T02:28:53.298Z'),
        required: false,
    })
    revokeAt?: Date;

    @ApiProperty({
        required: true,
        enum: ENUM_SESSION_STATUS,
        default: ENUM_SESSION_STATUS.ACTIVE,
    })
    status: ENUM_SESSION_STATUS;

    @ApiProperty({
        required: true,
        example: '244.175.148.3',
    })
    ip: string;

    @ApiProperty({
        required: true,
        example: 'enchanting-council.com',
    })
    hostname: string;

    @ApiProperty({
        required: true,
        example: 'http',
    })
    protocol: string;

    @ApiProperty({
        required: true,
        example: 'https://innocent-dress.com',
    })
    originalUrl: string;

    @ApiProperty({
        required: true,
        example: 'DELETE',
    })
    method: string;

    @ApiProperty({
        required: false,
        example:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 10_4 like Mac OS X) AppleWebKit/593.73.74 (KHTML, like Gecko) Version/17_1 Mobile/15E148 Safari/599.21',
    })
    userAgent?: string;

    @ApiProperty({
        required: false,
        example: '101.163.73.159',
    })
    xForwardedFor?: string;

    @ApiProperty({
        required: false,
        example: '248.248.90.80',
    })
    xForwardedHost?: string;

    @ApiProperty({
        required: false,
        example: 'https',
    })
    xForwardedPorto?: string;

    @ApiProperty({
        required: false,
        description: 'ISO country code resolved from the IP at sign-in',
        example: 'TK',
    })
    country?: string;

    @ApiProperty({
        required: false,
        description: 'Last time this session made an authenticated request',
        example: new Date('2026-08-30T11:34:33.869Z'),
    })
    lastActiveAt?: Date;
}
