import { ApiProperty } from '@nestjs/swagger';
import { ENUM_SETTING_UNIT } from 'src/modules/setting/enums/setting.enum';

export class SettingFileResponseDto {
    @ApiProperty({
        required: true,
        example: 8148911067332443,
    })
    size: number;

    @ApiProperty({
        required: true,
        example: ENUM_SETTING_UNIT.BYTE,
        enum: ENUM_SETTING_UNIT,
    })
    sizeUnit: ENUM_SETTING_UNIT;
}
