import { PickType } from '@nestjs/swagger';
import { ApiKeyGetResponseDto } from 'src/modules/api-key/dtos/response/api-key.get.response.dto';

export class ApiKeyPayloadDto extends PickType(ApiKeyGetResponseDto, [
    'id',
    'name',
    'type',
    'key',
] as const) {}
