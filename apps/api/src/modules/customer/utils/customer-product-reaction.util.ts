import { plainToInstance } from 'class-transformer';
import { CustomerProductReactionGetResponseDto } from '../dtos/response/customer-product-reaction.get.response.dto';
import { CustomerProductReactionEntity } from '../repository/entities/customer-product-reaction.entity';

/** Needs `productGroup` populated. */
export function customerProductReactionResponse(
    reaction: CustomerProductReactionEntity
): CustomerProductReactionGetResponseDto {
    return plainToInstance(
        CustomerProductReactionGetResponseDto,
        {
            productGroupId: reaction.productGroup.id,
            productGroupName: reaction.productGroup.name,
            until: reaction.until,
            reason: reaction.reason ?? null,
        },
        { excludeExtraneousValues: true }
    );
}
