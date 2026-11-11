import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
} from '@app/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from '@app/common/doc/enums/doc.enum';
import { WorkspaceDocParamsId } from '@app/modules/workspace/constants/workspace.doc.constant';
import { applyDecorators } from '@nestjs/common';
import { CustomerDocParamsId } from '../constants/customer.doc.constant';
import { CustomerProductReactionUpdateRequestDto } from '../dtos/request/customer-product-reaction.update.request.dto';
import { CustomerProductReactionGetResponseDto } from '../dtos/response/customer-product-reaction.get.response.dto';

const params = [
    ...WorkspaceDocParamsId,
    ...CustomerDocParamsId,
    {
        name: 'productGroupId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
    },
];

export function CustomerProductReactionWorkspaceUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'Tạm hoãn: do not offer a product group to this customer until a date',
        }),
        DocRequest({
            params,
            dto: CustomerProductReactionUpdateRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocResponse<CustomerProductReactionGetResponseDto>(
            'customerMarketing.reaction.update',
            { dto: CustomerProductReactionGetResponseDto }
        )
    );
}

export function CustomerProductReactionWorkspaceDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Offer a postponed product group to this customer again',
        }),
        DocRequest({
            params,
            queries: [
                {
                    name: 'reason',
                    required: false,
                    allowEmptyValue: true,
                    type: 'string',
                    description:
                        'Why the group can be offered again (kept in the history).',
                },
            ],
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocResponse('customerMarketing.reaction.delete')
    );
}
