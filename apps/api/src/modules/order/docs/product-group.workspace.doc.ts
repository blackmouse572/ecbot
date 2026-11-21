import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@app/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from '@app/common/doc/enums/doc.enum';
import { WorkspaceDocParamsId } from '@app/modules/workspace/constants/workspace.doc.constant';
import { applyDecorators } from '@nestjs/common';
import {
    ProductGroupDocParamsId,
    ProductGroupDocQueryStats,
} from '../constants/order.doc.constant';
import { ProductGroupCreateRequestDto } from '../dtos/request/product-group.create.request.dto';
import { ProductGroupUpdateRequestDto } from '../dtos/request/product-group.update.request.dto';
import { ProductGroupUpdateImageRequestDto } from '../dtos/request/product-group.update-image.request.dto';
import { ProductGroupUploadImageRequestDto } from '../dtos/request/product-group.upload-image.request.dto';
import { AwsS3PresignResponseDto } from 'src/modules/aws/dtos/response/aws.s3-presign.response.dto';
import { ProductGroupGetResponseDto } from '../dtos/response/product-group.get.response.dto';

const auth = () => DocAuth({ xApiKey: true, jwtAccessToken: true });

export function ProductGroupWorkspaceListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'List product groups' }),
        DocRequest({
            params: [...WorkspaceDocParamsId],
            queries: [...ProductGroupDocQueryStats],
        }),
        auth(),
        DocResponsePaging<ProductGroupGetResponseDto>(
            'order.productGroup.workspace.list',
            { dto: ProductGroupGetResponseDto }
        )
    );
}

export function ProductGroupWorkspaceCreateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'Create a product group' }),
        DocRequest({
            params: [...WorkspaceDocParamsId],
            dto: ProductGroupCreateRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        auth(),
        DocResponse<ProductGroupGetResponseDto>(
            'order.productGroup.workspace.create',
            { dto: ProductGroupGetResponseDto }
        )
    );
}

export function ProductGroupWorkspaceUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'Update a product group' }),
        DocRequest({
            params: [...WorkspaceDocParamsId, ...ProductGroupDocParamsId],
            dto: ProductGroupUpdateRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        auth(),
        DocResponse<ProductGroupGetResponseDto>(
            'order.productGroup.workspace.update',
            { dto: ProductGroupGetResponseDto }
        )
    );
}

export function ProductGroupWorkspaceDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'Delete a product group; its items keep their name' }),
        DocRequest({
            params: [...WorkspaceDocParamsId, ...ProductGroupDocParamsId],
        }),
        auth(),
        DocResponse('order.productGroup.workspace.delete')
    );
}

export function ProductGroupWorkspaceUploadImageDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'Get a URL to upload a product group photo to, then save it with PUT image',
        }),
        DocRequest({
            params: [...WorkspaceDocParamsId, ...ProductGroupDocParamsId],
            dto: ProductGroupUploadImageRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        auth(),
        DocResponse<AwsS3PresignResponseDto>(
            'order.productGroup.workspace.uploadImage',
            { dto: AwsS3PresignResponseDto }
        )
    );
}

export function ProductGroupWorkspaceUpdateImageDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'Save the uploaded photo as the product group photo' }),
        DocRequest({
            params: [...WorkspaceDocParamsId, ...ProductGroupDocParamsId],
            dto: ProductGroupUpdateImageRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        auth(),
        DocResponse<ProductGroupGetResponseDto>(
            'order.productGroup.workspace.updateImage',
            { dto: ProductGroupGetResponseDto }
        )
    );
}

export function ProductGroupWorkspaceDeleteImageDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'Remove the product group photo' }),
        DocRequest({
            params: [...WorkspaceDocParamsId, ...ProductGroupDocParamsId],
        }),
        auth(),
        DocResponse<ProductGroupGetResponseDto>(
            'order.productGroup.workspace.deleteImage',
            { dto: ProductGroupGetResponseDto }
        )
    );
}
