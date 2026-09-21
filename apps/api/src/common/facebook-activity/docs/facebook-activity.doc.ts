import { applyDecorators } from '@nestjs/common';
import { ApiParamOptions } from '@nestjs/swagger';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponsePaging,
} from 'src/common/doc/decorators/doc.decorator';
import {
    FacebookActivityDocPageParams,
    FacebookActivityDocSenderParams,
} from '../constants/facebook-activity.doc.constant';
import { FacebookActivityListResponseDto } from '../dtos/response/facebook-activity.list.response.dto';

type ListingDoc = {
    summary: string;
    messagePath: string;
    params?: ApiParamOptions[];
};

/** The listings differ only by message path and by the id in their path. */
function listing(options: ListingDoc): MethodDecorator {
    const { summary, messagePath, params } = options;
    const applied = [
        Doc({ summary }),
        ...(params ? [DocRequest({ params })] : []),
        DocAuth({ xApiKey: true }),
        DocResponsePaging<FacebookActivityListResponseDto>(messagePath, {
            dto: FacebookActivityListResponseDto,
        }),
    ];

    return applyDecorators(...applied);
}

export function FacebookActivityListingDoc(): MethodDecorator {
    return listing({
        summary: 'list stored facebook webhook activities',
        messagePath: 'facebook-activity.list',
    });
}

export function FacebookActivityPageListingDoc(): MethodDecorator {
    return listing({
        summary: 'list stored facebook webhook activities of one page',
        messagePath: 'facebook-activity.listByPageId',
        params: FacebookActivityDocPageParams,
    });
}

export function FacebookActivitySenderListingDoc(): MethodDecorator {
    return listing({
        summary: 'list stored facebook webhook activities of one sender',
        messagePath: 'facebook-activity.listBySenderId',
        params: FacebookActivityDocSenderParams,
    });
}
