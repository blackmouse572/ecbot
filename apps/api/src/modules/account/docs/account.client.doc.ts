import { ENUM_DOC_REQUEST_BODY_TYPE } from '@app/common/doc/enums/doc.enum';
import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from 'src/common/doc/decorators/doc.decorator';
import { BROWSER_CONNECT_PLATFORMS } from '../dtos/request/account.client-connect-link.request.dto';
import { AccountClientTelegramRequestDto } from '../dtos/request/account.client-telegram.request.dto';
import { AccountProvisionApiChannelRequestDto } from '../dtos/request/account.provision-api-channel.request.dto';
import { AccountProvisionWebsiteWidgetRequestDto } from '../dtos/request/account.provision-website-widget.request.dto';
import { AccountClientConnectLinkResponseDto } from '../dtos/response/account.client-connect-link.response.dto';
import { AccountGetDetailResponseDto } from '../dtos/response/account.detail.response.dto';
import { AccountListResponseDto } from '../dtos/response/account.list.response.dto';
import { AccountProvisionApiChannelResponseDto } from '../dtos/response/account.provision-api-channel.response.dto';
import { AccountProvisionWebsiteWidgetResponseDto } from '../dtos/response/account.provision-website-widget.response.dto';
import { ENUM_ACCOUNT_STATUS, ENUM_ACCOUNT_TYPE } from '../enums/account.enum';

const ACCOUNT_ID_PARAM = [
    {
        name: 'id',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: 'a7cfe191-df95-4cd6-9744-c9372f3c916a',
    },
];

export function AccountClientListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'list the channels connected to the credential workspace',
        }),
        DocRequest({
            queries: [
                { name: 'status', required: false, enum: ENUM_ACCOUNT_STATUS },
                { name: 'type', required: false, enum: ENUM_ACCOUNT_TYPE },
                { name: 'account', required: false, type: 'string' },
            ],
        }),
        DocAuth({ xApiKey: true }),
        DocResponsePaging<AccountListResponseDto>('account.list', {
            dto: AccountListResponseDto,
        })
    );
}

export function AccountClientGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'get a connected channel' }),
        DocRequest({ params: ACCOUNT_ID_PARAM }),
        DocAuth({ xApiKey: true }),
        DocResponse('account.get', { dto: AccountGetDetailResponseDto })
    );
}

export function AccountClientApiChannelDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'create an API channel',
            description:
                'The signing secret is returned once and cannot be read again.',
        }),
        DocRequest({
            dto: AccountProvisionApiChannelRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({ xApiKey: true }),
        DocResponse('account.provisionApiChannel', {
            dto: AccountProvisionApiChannelResponseDto,
        })
    );
}

export function AccountClientWebsiteWidgetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'create a website widget' }),
        DocRequest({
            dto: AccountProvisionWebsiteWidgetRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({ xApiKey: true }),
        DocResponse('account.provisionWebsiteWidget', {
            dto: AccountProvisionWebsiteWidgetResponseDto,
        })
    );
}

export function AccountClientTelegramDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'connect a Telegram bot from its BotFather token' }),
        DocRequest({
            dto: AccountClientTelegramRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({ xApiKey: true }),
        DocResponse('account.connectTelegram', {
            dto: AccountGetDetailResponseDto,
        })
    );
}

export function AccountClientConnectLinkDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                "link to the app's connect page for a browser sign-in channel",
        }),
        DocRequest({
            queries: [
                {
                    name: 'platform',
                    required: true,
                    enum: BROWSER_CONNECT_PLATFORMS,
                },
            ],
        }),
        DocAuth({ xApiKey: true }),
        DocResponse('account.connectLink', {
            dto: AccountClientConnectLinkResponseDto,
        })
    );
}
