import { ApiProperty } from '@nestjs/swagger';

export class EmailTempPasswordDto {
    @ApiProperty({
        required: true,
        example: 'QeHb6X1scV',
        description: 'Expired at by date',
    })
    password: string;

    @ApiProperty({
        required: true,
        example: new Date('2027-05-11T06:38:34.924Z'),
        description: 'Expired at by date',
    })
    passwordExpiredAt: Date;
}
