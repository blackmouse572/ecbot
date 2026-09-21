import { ApiProperty } from '@nestjs/swagger';

export class EmailResetPasswordDto {
    @ApiProperty({
        required: true,
        example: 'https://gray-casket.net/',
    })
    url: string;

    @ApiProperty({
        required: true,
        example: new Date('2027-02-03T15:00:25.386Z'),
        description: 'Expired at by date',
    })
    expiredDate: Date;
}
