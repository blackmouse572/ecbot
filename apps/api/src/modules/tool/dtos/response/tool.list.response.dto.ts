import { OmitType } from '@nestjs/swagger';
import { ToolResponseDto } from './tool.response.dto';

export class ToolListResponseDto extends OmitType(ToolResponseDto, [
    'httpInputSchema',
    'discoveredActions',
] as const) {}
