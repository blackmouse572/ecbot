import { ApiProperty } from '@nestjs/swagger';
import {
    IsBoolean,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

export class CustomerTagCreateRequestDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(64)
    @ApiProperty()
    name: string;

    @IsOptional()
    @IsString()
    @MaxLength(16)
    @ApiProperty({ type: String, required: false, nullable: true })
    emoji?: string | null;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    @ApiProperty({ type: String, required: false, nullable: true })
    description?: string | null;

    @IsOptional()
    @IsBoolean()
    @ApiProperty({ required: false, default: false })
    triggersHandoff?: boolean;

    @IsOptional()
    @IsBoolean()
    @ApiProperty({
        required: false,
        default: false,
        description:
            'Notify the team when the agent applies this tag, without handing the conversation over',
    })
    notifiesTeam?: boolean;
}
