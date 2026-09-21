import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateHttpToolRequestDto } from './create-http-tool.request.dto';

export class UpdateToolRequestDto extends PartialType(
    OmitType(CreateHttpToolRequestDto, ['httpMethod', 'httpUrl'] as const)
) {}
