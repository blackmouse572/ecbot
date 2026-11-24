import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@app/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from '@app/common/doc/enums/doc.enum';
import { WorkspaceDocParamsId } from '@app/modules/workspace/constants/workspace.doc.constant';
import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
    MarketingSendDocParamsId,
    MarketingSendDocQueryList,
} from '../constants/marketing-send.doc.constant';
import { MarketingSendCreateRequestDto } from '../dtos/request/marketing-send.create.request.dto';
import { MarketingSendDraftRequestDto } from '../dtos/request/marketing-send.draft.request.dto';
import { MarketingSendUpdateRequestDto } from '../dtos/request/marketing-send.update.request.dto';
import {
    MarketingSendGetResponseDto,
    MarketingSendListResponseDto,
    MarketingSendReplyResponseDto,
} from '../dtos/response/marketing-send.get.response.dto';
import { MarketingSendDraftResponseDto } from '../dtos/response/marketing-send.draft.response.dto';

const auth = () => DocAuth({ xApiKey: true, jwtAccessToken: true });
const withId = [...WorkspaceDocParamsId, ...MarketingSendDocParamsId];

export function MarketingSendCreateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Send an offer to a stage or conditions, once or each day',
        }),
        DocRequest({
            params: WorkspaceDocParamsId,
            dto: MarketingSendCreateRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        auth(),
        DocResponse<MarketingSendGetResponseDto>('marketingSend.create', {
            dto: MarketingSendGetResponseDto,
            httpStatus: HttpStatus.CREATED,
        })
    );
}

export function MarketingSendListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'Đã gửi: every send, with its results' }),
        DocRequest({
            params: WorkspaceDocParamsId,
            queries: MarketingSendDocQueryList,
        }),
        auth(),
        DocResponsePaging<MarketingSendListResponseDto>('marketingSend.list', {
            dto: MarketingSendListResponseDto,
        })
    );
}

export function MarketingSendGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'One send: results, by channel, and who it could not send to',
        }),
        DocRequest({ params: withId }),
        auth(),
        DocResponse<MarketingSendGetResponseDto>('marketingSend.get', {
            dto: MarketingSendGetResponseDto,
        })
    );
}

export function MarketingSendUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'Rename a send, change its text or picture, or turn an AUTO send off or on',
        }),
        DocRequest({
            params: withId,
            dto: MarketingSendUpdateRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        auth(),
        DocResponse<MarketingSendGetResponseDto>('marketingSend.update', {
            dto: MarketingSendGetResponseDto,
        })
    );
}

export function MarketingSendRepliesDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'Khách đã trả lời: customers who answered the send' }),
        DocRequest({ params: withId }),
        auth(),
        DocResponsePaging<MarketingSendReplyResponseDto>(
            'marketingSend.replies',
            { dto: MarketingSendReplyResponseDto }
        )
    );
}

export function MarketingSendDraftDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                "AI soạn giúp: draft a send's text for a stage or conditions",
        }),
        DocRequest({
            params: WorkspaceDocParamsId,
            dto: MarketingSendDraftRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        auth(),
        DocResponse<MarketingSendDraftResponseDto>('marketingSend.draft', {
            dto: MarketingSendDraftResponseDto,
        })
    );
}
