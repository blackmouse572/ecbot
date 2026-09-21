import { BatchIdsRequestDto } from '@app/common/batch/dtos/batch.request.dto';
import { BatchResultResponseDto } from '@app/common/batch/dtos/batch.response.dto';
import { ENUM_DOC_REQUEST_BODY_TYPE } from '@app/common/doc/enums/doc.enum';
import { IDocRequestOptions } from '@app/common/doc/interfaces/doc.interface';
import { WorkspaceDocParamsId } from '@app/modules/workspace/constants/workspace.doc.constant';
import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from 'src/common/doc/decorators/doc.decorator';
import {
    AccountDocParamsId,
    BasedAccountDocParams,
} from '../constants/account.doc.constant';
import { AccountLinkRequestDto } from '../dtos/request/account.link.request.dto';
import { AccountProvisionApiChannelRequestDto } from '../dtos/request/account.provision-api-channel.request.dto';
import { AccountProvisionApiChannelResponseDto } from '../dtos/response/account.provision-api-channel.response.dto';
import { AccountProvisionWebsiteWidgetRequestDto } from '../dtos/request/account.provision-website-widget.request.dto';
import { AccountProvisionWebsiteWidgetResponseDto } from '../dtos/response/account.provision-website-widget.response.dto';
import { AccountUpdateCallbackUrlRequestDto } from '../dtos/request/account.update-callback-url.request.dto';
import { AccountUpdateCallbackUrlResponseDto } from '../dtos/response/account.update-callback-url.response.dto';
import { AccountUpdateAllowedOriginsRequestDto } from '../dtos/request/account.update-allowed-origins.request.dto';
import { AccountUpdateAllowedOriginsResponseDto } from '../dtos/response/account.update-allowed-origins.response.dto';
import { AccountGetDetailResponseDto } from '../dtos/response/account.detail.response.dto';
import { AccountListResponseDto } from '../dtos/response/account.list.response.dto';
import { ENUM_ACCOUNT_STATUS } from '../enums/account.enum';

const AUTH = { xApiKey: true, jwtAccessToken: true };

// Both list endpoints are workspace-scoped and take the same filters.
const LIST_FILTERS = [
    { name: 'status', required: false, enum: ENUM_ACCOUNT_STATUS },
    { name: 'account', required: false, type: 'string' },
    { name: 'chatbot', required: false, type: 'string' },
];

const LIST_REQUEST: IDocRequestOptions = {
    params: [...WorkspaceDocParamsId],
    queries: LIST_FILTERS,
};

/** The two list endpoints differ only in their summary. */
function listDoc(summary: string): MethodDecorator {
    return applyDecorators(
        Doc({ summary }),
        DocRequest(LIST_REQUEST),
        DocAuth(AUTH),
        DocResponsePaging<AccountListResponseDto>('account.list', {
            dto: AccountListResponseDto,
        })
    );
}

export function AccountListDoc(): MethodDecorator {
    return listDoc('get all of accounts');
}

export function AccountListUnlinkedDoc(): MethodDecorator {
    return listDoc('get the accounts no chatbot has claimed yet');
}

export function AccountGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get detail of account',
        }),
        DocRequest({
            params: AccountDocParamsId,
        }),
        DocAuth(AUTH),
        DocResponse<AccountGetDetailResponseDto>('account.get', {
            dto: AccountGetDetailResponseDto,
        })
    );
}

export function DeleteSyncAccountDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'delete sync account',
        }),
        DocRequest({ params: AccountDocParamsId }),
        DocAuth(AUTH),
        DocGuard({ policy: true }),
        DocResponse<Promise<boolean>>('account.deleteSync')
    );
}

export function AccountLinkDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'link an account',
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: AccountLinkRequestDto,
            params: BasedAccountDocParams,
        }),
        DocAuth(AUTH),
        DocGuard({ policy: true }),
        DocResponse('account.link')
    );
}

export function AccountProvisionApiChannelDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'provision an API channel account (secret shown once)',
            description:
                'Create an API channel and mint its callback signing secret. The secret is stored encrypted and is never readable again — rotate to replace a lost one.',
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: AccountProvisionApiChannelRequestDto,
            params: BasedAccountDocParams,
        }),
        DocAuth(AUTH),
        DocGuard({ policy: true }),
        DocResponse('account.provisionApiChannel', {
            dto: AccountProvisionApiChannelResponseDto,
        })
    );
}

export function AccountRotateApiChannelSecretDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'rotate an API channel signing secret (shown once)',
            description:
                'Mint a new callback signing secret. The account key and callback URL are unchanged; signatures made with the previous secret stop verifying immediately.',
        }),
        DocRequest({ params: BasedAccountDocParams }),
        DocAuth(AUTH),
        DocGuard({ policy: true }),
        DocResponse('account.rotateApiChannelSecret', {
            dto: AccountProvisionApiChannelResponseDto,
        })
    );
}

export function AccountUpdateCallbackUrlDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'update an API channel callback URL',
            description:
                'Change where bot replies are POSTed. The account key and signing secret are unchanged.',
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: AccountUpdateCallbackUrlRequestDto,
            params: AccountDocParamsId,
        }),
        DocAuth(AUTH),
        DocGuard({ policy: true }),
        DocResponse('account.updateCallbackUrl', {
            dto: AccountUpdateCallbackUrlResponseDto,
        })
    );
}

export function AccountUpdateAllowedOriginsDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'update a website widget allowed origins',
            description:
                'Replace the sites allowed to embed this widget. The widget key is unchanged.',
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: AccountUpdateAllowedOriginsRequestDto,
            params: AccountDocParamsId,
        }),
        DocAuth(AUTH),
        DocGuard({ policy: true }),
        DocResponse('account.updateAllowedOrigins', {
            dto: AccountUpdateAllowedOriginsResponseDto,
        })
    );
}

export function AccountProvisionWebsiteWidgetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'provision a website widget account',
            description:
                'Create an embeddable chat widget and its public key. The key is not a secret — it ships in the embed snippet; the allowlist is what restricts where it renders.',
        }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: AccountProvisionWebsiteWidgetRequestDto,
            params: BasedAccountDocParams,
        }),
        DocAuth(AUTH),
        DocGuard({ policy: true }),
        DocResponse('account.provisionWebsiteWidget', {
            dto: AccountProvisionWebsiteWidgetResponseDto,
        })
    );
}

export function AccountBatchDeleteSyncDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'unlink several accounts',
            description:
                'Unlink every account in `ids`. Each id is processed independently, so the response reports which ones succeeded and which ones failed.',
        }),
        DocRequest({
            dto: BatchIdsRequestDto,
            params: [...WorkspaceDocParamsId],
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth(AUTH),
        DocGuard({ policy: true }),
        DocResponse<BatchResultResponseDto>('account.batchDeleteSync', {
            dto: BatchResultResponseDto,
        })
    );
}
