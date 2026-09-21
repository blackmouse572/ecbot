import { ENUM_APP_STATUS_CODE_ERROR } from '@app/app/enums/app.status-code.enum';
import { HttpStatus, applyDecorators } from '@nestjs/common';
import { DatabaseIdResponseDto } from 'src/common/database/dtos/response/database.id.response.dto';
import {
    Doc,
    DocAuth,
    DocDefault,
    DocGuard,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from 'src/common/doc/decorators/doc.decorator';
import { IDocRequestOptions } from 'src/common/doc/interfaces/doc.interface';
import { ENUM_DOC_REQUEST_BODY_TYPE } from 'src/common/doc/enums/doc.enum';
import { AccountDocParamsId } from '../constants/account.doc.constant';
import { AccountCreateRequestDto } from '../dtos/request/account.create.request.dto';
import { AccountUpdateStatusRequestDto } from '../dtos/request/account.update-status.request.dto';
import { AccountUpdateRequestDto } from '../dtos/request/account.update.request.dto';
import { AccountGetDetailResponseDto } from '../dtos/response/account.detail.response.dto';
import { AccountListResponseDto } from '../dtos/response/account.list.response.dto';
import { ENUM_ACCOUNT_STATUS } from '../enums/account.enum';

const AUTH = { xApiKey: true, jwtAccessToken: true };
const GUARD = { role: true, policy: true };

// Admin reads span every workspace, so the workspace itself is a filter.
const LIST_REQUEST: IDocRequestOptions = {
    queries: [
        { name: 'status', required: false, enum: ENUM_ACCOUNT_STATUS },
        { name: 'workspace', required: false, type: 'string' },
        { name: 'account', required: false, type: 'string' },
    ],
};

export function AccountAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all accounts',
        }),
        DocRequest(LIST_REQUEST),
        DocAuth(AUTH),
        DocGuard(GUARD),
        DocResponsePaging<AccountListResponseDto>('account.list', {
            dto: AccountListResponseDto,
        })
    );
}

export function AccountAdminGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get detail an account',
        }),
        DocRequest({
            params: AccountDocParamsId,
        }),
        DocAuth(AUTH),
        DocGuard(GUARD),
        DocResponse<AccountGetDetailResponseDto>('account.get', {
            dto: AccountGetDetailResponseDto,
        }),
        DocDefault({
            httpStatus: HttpStatus.NOT_FOUND,
            messagePath: 'account.get.notFound',
            statusCode: ENUM_APP_STATUS_CODE_ERROR.NOT_FOUND,
        })
    );
}

export function AccountAdminCreateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'create an account',
        }),
        DocAuth(AUTH),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: AccountCreateRequestDto,
        }),
        DocGuard(GUARD),
        DocResponse<DatabaseIdResponseDto>('account.create', {
            httpStatus: HttpStatus.CREATED,
            dto: DatabaseIdResponseDto,
        })
    );
}

export function AccountAdminUpdateStatusDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'update status of account',
        }),
        DocRequest({
            params: AccountDocParamsId,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: AccountUpdateStatusRequestDto,
        }),
        DocAuth(AUTH),
        DocGuard(GUARD),
        DocResponse('account.updateStatus')
    );
}

export function AccountAdminUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'update an account',
        }),
        DocRequest({
            params: AccountDocParamsId,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: AccountUpdateRequestDto,
        }),
        DocAuth(AUTH),
        DocGuard(GUARD),
        DocResponse('account.update')
    );
}
