import { PartialType } from '@nestjs/swagger';
import { CustomerTagCreateRequestDto } from './customer-tag.create.request.dto';

// PartialType keeps the create-DTO validators (IsString, MaxLength, …) but
// flips every field to optional, so update payloads validate the same shape
// without duplicating the field list.
export class CustomerTagUpdateRequestDto extends PartialType(
    CustomerTagCreateRequestDto
) {}
