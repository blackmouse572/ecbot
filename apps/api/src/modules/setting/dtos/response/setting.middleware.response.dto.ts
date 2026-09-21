import { ApiProperty } from '@nestjs/swagger';
import { ENUM_SETTING_UNIT } from 'src/modules/setting/enums/setting.enum';

export class SettingMiddlewareResponseDto {
    @ApiProperty({
        required: true,
        example: 3260225345919962,
    })
    bodyJson: number;

    @ApiProperty({
        required: true,
        example: ENUM_SETTING_UNIT.BYTE,
        enum: ENUM_SETTING_UNIT,
    })
    bodyJsonUnit: ENUM_SETTING_UNIT;

    @ApiProperty({
        required: true,
        example: 3412829857568901,
    })
    bodyRaw: number;

    @ApiProperty({
        required: true,
        example: ENUM_SETTING_UNIT.BYTE,
        enum: ENUM_SETTING_UNIT,
    })
    bodyRawUnit: ENUM_SETTING_UNIT;

    @ApiProperty({
        required: true,
        example: 3983499979044534,
    })
    bodyText: number;

    @ApiProperty({
        required: true,
        example: ENUM_SETTING_UNIT.BYTE,
        enum: ENUM_SETTING_UNIT,
    })
    bodyTextUnit: ENUM_SETTING_UNIT;

    @ApiProperty({
        required: true,
        example: 8462990637556805,
    })
    bodyUrlencoded: number;

    @ApiProperty({
        required: true,
        example: ENUM_SETTING_UNIT.BYTE,
        enum: ENUM_SETTING_UNIT,
    })
    bodyUrlencodedUnit: ENUM_SETTING_UNIT;
}
