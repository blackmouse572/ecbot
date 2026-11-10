import { PartialType } from '@nestjs/swagger';
import { ProductGroupCreateRequestDto } from './product-group.create.request.dto';

export class ProductGroupUpdateRequestDto extends PartialType(
    ProductGroupCreateRequestDto
) {}
